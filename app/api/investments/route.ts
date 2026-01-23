/**
 * Investments API
 * GET - List portfolio investments with metrics
 * POST - Create a new investment (closed deal)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // ACTIVE, EXITED, WRITTEN_OFF
    const organizationId = searchParams.get('organizationId');
    const minOwnership = searchParams.get('minOwnership');
    const includeMetrics = searchParams.get('includeMetrics') === 'true';

    // Build where clause
    const where: any = {};

    if (status) where.status = status;
    if (organizationId) where.organizationId = organizationId;
    if (minOwnership) {
      where.ownership = { gte: parseFloat(minOwnership) };
    }

    const investments = await prisma.investment.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            organizationType: true,
            industry: true,
            stage: true,
            website: true,
            logoUrl: true
          }
        },
        deal: {
          select: {
            id: true,
            name: true,
            dealType: true
          }
        },
        metrics: includeMetrics
          ? {
              orderBy: { snapshotDate: 'desc' },
              take: 12 // Last 12 data points
            }
          : false
      },
      orderBy: { investmentDate: 'desc' }
    });

    // Calculate returns for each investment
    const enrichedInvestments = investments.map(inv => {
      const latestValuation = inv.currentValuation || inv.investmentAmount;
      const unrealizedGain = latestValuation - inv.investmentAmount;
      const unrealizedMultiple = latestValuation / inv.investmentAmount;

      let realizedGain = 0;
      let realizedMultiple = 0;
      if (inv.exitAmount) {
        realizedGain = inv.exitAmount - inv.investmentAmount;
        realizedMultiple = inv.exitAmount / inv.investmentAmount;
      }

      return {
        ...inv,
        investmentAmount: Number(inv.investmentAmount),
        currentValuation: inv.currentValuation ? Number(inv.currentValuation) : null,
        ownership: inv.ownership ? Number(inv.ownership) : null,
        exitAmount: inv.exitAmount ? Number(inv.exitAmount) : null,
        unrealizedGain,
        unrealizedMultiple,
        realizedGain,
        realizedMultiple,
        metrics: inv.metrics
          ? inv.metrics.map(m => ({
              ...m,
              value: Number(m.value),
              confidence: Number(m.confidence)
            }))
          : undefined
      };
    });

    // Portfolio-level summary
    const totalInvested = enrichedInvestments.reduce(
      (sum, inv) => sum + inv.investmentAmount,
      0
    );
    const totalCurrentValue = enrichedInvestments.reduce(
      (sum, inv) => sum + (inv.currentValuation || inv.investmentAmount),
      0
    );
    const totalRealizedValue = enrichedInvestments
      .filter(inv => inv.exitAmount)
      .reduce((sum, inv) => sum + inv.exitAmount!, 0);

    const summary = {
      totalInvestments: enrichedInvestments.length,
      byStatus: enrichedInvestments.reduce((acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalInvested,
      totalCurrentValue,
      totalUnrealizedGain: totalCurrentValue - totalInvested,
      totalRealizedValue,
      portfolioMultiple: totalCurrentValue / totalInvested,
      exitCount: enrichedInvestments.filter(inv => inv.status === 'EXITED').length,
      activeCount: enrichedInvestments.filter(inv => inv.status === 'ACTIVE').length
    };

    return NextResponse.json({
      investments: enrichedInvestments,
      summary
    });
  } catch (error) {
    console.error('Failed to fetch investments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch investments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      dealId,
      investmentDate,
      investmentAmount,
      ownership,
      currentValuation,
      status,
      notes,
      boardSeat,
      investorRights
    } = body;

    // Validate required fields
    if (!organizationId || !investmentDate || !investmentAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: organizationId, investmentDate, investmentAmount' },
        { status: 400 }
      );
    }

    // Validate status enum
    const validStatuses = ['ACTIVE', 'EXITED', 'WRITTEN_OFF'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Create investment
    const investment = await prisma.investment.create({
      data: {
        organizationId,
        dealId,
        investmentDate: new Date(investmentDate),
        investmentAmount,
        ownership,
        currentValuation: currentValuation || investmentAmount, // Default to investment amount
        status: status || 'ACTIVE',
        notes,
        boardSeat: boardSeat || false,
        investorRights
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            organizationType: true,
            industry: true,
            stage: true
          }
        },
        deal: {
          select: {
            id: true,
            name: true,
            dealType: true
          }
        }
      }
    });

    // If linked to a deal, update deal status to PORTFOLIO
    if (dealId) {
      await prisma.deal.update({
        where: { id: dealId },
        data: { stage: 'PORTFOLIO' }
      });
    }

    return NextResponse.json(
      {
        investment: {
          ...investment,
          investmentAmount: Number(investment.investmentAmount),
          currentValuation: investment.currentValuation ? Number(investment.currentValuation) : null,
          ownership: investment.ownership ? Number(investment.ownership) : null
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create investment:', error);
    return NextResponse.json(
      { error: 'Failed to create investment' },
      { status: 500 }
    );
  }
}
