/**
 * Organizations API
 * GET - List all organizations with filtering
 * POST - Create a new organization (with automatic deduplication)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolveOrCreateOrganization, type OrganizationInput } from '@/lib/normalization/entity-resolver';
import { extractDomain } from '@/lib/normalization/canonical-keys';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // PORTFOLIO, PROSPECT, LP, etc.
    const industry = searchParams.get('industry');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {};
    if (type) where.organizationType = type;
    if (industry) where.industry = { contains: industry, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const organizations = await prisma.organization.findMany({
      where,
      include: {
        deals: {
          select: {
            id: true,
            name: true,
            stage: true,
            valuation: true,
            ourAllocation: true
          },
          orderBy: { createdAt: 'desc' }
        },
        investments: {
          select: {
            id: true,
            amountInvested: true,
            investmentDate: true,
            status: true
          }
        },
        metrics: {
          orderBy: { snapshotDate: 'desc' },
          take: 1, // Just latest for each metric type
          distinct: ['metricType']
        },
        _count: {
          select: {
            facts: true,
            conversations: true,
            tasks: true
          }
        }
      },
      orderBy: [
        { organizationType: 'asc' },
        { name: 'asc' }
      ]
    });

    // Calculate summary metrics
    const portfolioCount = organizations.filter(o => o.organizationType === 'PORTFOLIO').length;
    const prospectCount = organizations.filter(o => o.organizationType === 'PROSPECT').length;
    const lpCount = organizations.filter(o => o.organizationType === 'LP').length;

    const totalInvested = organizations
      .flatMap(o => o.investments)
      .reduce((sum, i) => sum + Number(i.amountInvested), 0);

    const activeDeals = organizations
      .flatMap(o => o.deals)
      .filter(d => !['PASSED', 'PORTFOLIO'].includes(d.stage));

    const summary = {
      totalOrganizations: organizations.length,
      portfolioCompanies: portfolioCount,
      prospects: prospectCount,
      lps: lpCount,
      totalInvested,
      activeDeals: activeDeals.length,
      industryBreakdown: getIndustryBreakdown(organizations),
      stageBreakdown: getStageBreakdown(organizations)
    };

    return NextResponse.json({ organizations, summary });
  } catch (error) {
    console.error('Failed to fetch organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      domain,
      website,
      legalName,
      description,
      organizationType,
      industry,
      stage,
      logoUrl,
      privacyTier
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Extract domain from website if not provided
    const finalDomain = domain || (website ? extractDomain(website) : null);

    const input: OrganizationInput = {
      name,
      domain: finalDomain,
      website,
      legalName,
      description,
      organizationType: organizationType || 'PROSPECT',
      industry,
      stage,
      logoUrl,
      privacyTier: privacyTier || 'INTERNAL'
    };

    // Use entity resolver for automatic deduplication
    const result = await resolveOrCreateOrganization(input, true);

    return NextResponse.json({
      organization: result.organization,
      isNew: result.isNew,
      wasUpdated: result.wasUpdated
    }, { status: result.isNew ? 201 : 200 });
  } catch (error) {
    console.error('Failed to create/update organization:', error);
    return NextResponse.json(
      { error: 'Failed to create/update organization' },
      { status: 500 }
    );
  }
}

// Helper functions
function getIndustryBreakdown(organizations: any[]) {
  const breakdown: Record<string, number> = {};
  organizations.forEach(o => {
    const industry = o.industry || 'Other';
    breakdown[industry] = (breakdown[industry] || 0) + 1;
  });
  return Object.entries(breakdown)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function getStageBreakdown(organizations: any[]) {
  const breakdown: Record<string, number> = {};
  organizations
    .filter(o => o.stage)
    .forEach(o => {
      breakdown[o.stage] = (breakdown[o.stage] || 0) + 1;
    });
  return Object.entries(breakdown)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
