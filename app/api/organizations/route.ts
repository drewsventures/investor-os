/**
 * Organizations API
 * GET - List all organizations with filtering
 * POST - Create a new organization (with automatic deduplication)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
      orderBy: [
        { organizationType: 'asc' },
        { name: 'asc' }
      ]
    });

    // Calculate summary metrics
    const portfolioCount = organizations.filter(o => o.organizationType === 'PORTFOLIO').length;
    const prospectCount = organizations.filter(o => o.organizationType === 'PROSPECT').length;
    const lpCount = organizations.filter(o => o.organizationType === 'LP').length;

    const summary = {
      totalOrganizations: organizations.length,
      portfolioCompanies: portfolioCount,
      prospects: prospectCount,
      lps: lpCount,
      totalInvested: 0,
      activeDeals: 0,
      industryBreakdown: getIndustryBreakdown(organizations),
      stageBreakdown: getStageBreakdown(organizations)
    };

    return NextResponse.json({ organizations, summary });
  } catch (error) {
    console.error('Failed to fetch organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations', details: String(error) },
      { status: 500 }
    );
  }
}

// POST temporarily disabled - use direct prisma calls
export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'POST temporarily disabled' }, { status: 501 });
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
