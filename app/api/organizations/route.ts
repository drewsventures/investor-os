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
      include: {
        emailLinks: {
          include: { email: { select: { sentAt: true } } }
        },
        conversations: {
          select: { conversationDate: true }
        },
        updates: {
          select: { updateDate: true }
        }
      },
      orderBy: [
        { organizationType: 'asc' },
        { name: 'asc' }
      ]
    });

    // Calculate lastActivityAt for each organization
    const orgsWithActivity = organizations.map(org => {
      const dates: Date[] = [];

      // Get most recent email date
      org.emailLinks.forEach(link => {
        if (link.email?.sentAt) {
          dates.push(new Date(link.email.sentAt));
        }
      });

      // Get most recent conversation date
      org.conversations.forEach(conv => {
        if (conv.conversationDate) {
          dates.push(new Date(conv.conversationDate));
        }
      });

      // Get most recent update date
      org.updates.forEach(update => {
        if (update.updateDate) {
          dates.push(new Date(update.updateDate));
        }
      });

      const lastActivityAt = dates.length > 0
        ? new Date(Math.max(...dates.map(d => d.getTime())))
        : null;

      // Remove the included relations from the response
      const { emailLinks, conversations, updates, ...orgData } = org;

      return {
        ...orgData,
        lastActivityAt,
        conversationCount: conversations.length,
        emailCount: emailLinks.length,
      };
    });

    // Calculate summary metrics
    const portfolioCount = orgsWithActivity.filter(o => o.organizationType === 'PORTFOLIO').length;
    const prospectCount = orgsWithActivity.filter(o => o.organizationType === 'PROSPECT').length;
    const lpCount = orgsWithActivity.filter(o => o.organizationType === 'LP').length;

    const summary = {
      totalOrganizations: orgsWithActivity.length,
      portfolioCompanies: portfolioCount,
      prospects: prospectCount,
      lps: lpCount,
      totalInvested: 0,
      activeDeals: 0,
      industryBreakdown: getIndustryBreakdown(orgsWithActivity),
      stageBreakdown: getStageBreakdown(orgsWithActivity)
    };

    return NextResponse.json({ organizations: orgsWithActivity, summary });
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
