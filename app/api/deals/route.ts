/**
 * Deals API
 * GET - List all deals with filtering by stage
 * POST - Create a new deal
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const organizationType = searchParams.get('organizationType');

    const where: any = {};
    if (stage) where.stage = stage;

    const deals = await prisma.deal.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            domain: true,
            organizationType: true,
            industry: true,
            stage: true
          }
        },
        facts: {
          where: { validUntil: null },
          orderBy: { validFrom: 'desc' },
          take: 10
        },
        tasks: {
          where: { status: { not: 'DONE' } },
          orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }]
        },
        stageHistory: {
          orderBy: { transitionDate: 'desc' },
          take: 5
        },
        _count: {
          select: {
            conversations: true,
            facts: true,
            stageHistory: true
          }
        }
      },
      orderBy: [
        { stage: 'asc' },
        { expectedCloseDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Filter by organization type if specified
    const filteredDeals = organizationType
      ? deals.filter(d => d.organization.organizationType === organizationType)
      : deals;

    // Calculate summary
    const dealsByStage = filteredDeals.reduce((acc, deal) => {
      acc[deal.stage] = (acc[deal.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalValue = filteredDeals
      .filter(d => d.ourAllocation)
      .reduce((sum, d) => sum + Number(d.ourAllocation), 0);

    const activeDeals = filteredDeals.filter(d =>
      !['PASSED', 'PORTFOLIO'].includes(d.stage)
    );

    const summary = {
      totalDeals: filteredDeals.length,
      activeDeals: activeDeals.length,
      dealsByStage,
      totalPotentialInvestment: totalValue
    };

    return NextResponse.json({ deals: filteredDeals, summary });
  } catch (error) {
    console.error('Failed to fetch deals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      name,
      stage,
      dealType,
      askAmount,
      ourAllocation,
      valuation,
      valuationType,
      expectedCloseDate,
      privacyTier
    } = body;

    // Validate required fields
    if (!organizationId || !name) {
      return NextResponse.json(
        { error: 'Organization ID and name are required' },
        { status: 400 }
      );
    }

    const deal = await prisma.deal.create({
      data: {
        organizationId,
        name,
        stage: stage || 'SOURCED',
        dealType: dealType || 'EQUITY',
        askAmount,
        ourAllocation,
        valuation,
        valuationType,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        firstContactDate: new Date(),
        privacyTier: privacyTier || 'SENSITIVE'
      },
      include: {
        organization: true
      }
    });

    return NextResponse.json({ deal }, { status: 201 });
  } catch (error) {
    console.error('Failed to create deal:', error);
    return NextResponse.json(
      { error: 'Failed to create deal' },
      { status: 500 }
    );
  }
}
