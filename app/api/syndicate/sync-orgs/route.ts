/**
 * Syndicate Organizations Sync API
 * POST - Create Organizations from syndicate deals and link them
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Generate canonical key from company name
function generateCanonicalKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// POST - Sync syndicate deals with organizations
export async function POST() {
  try {
    // Get all unique company names from syndicate deals
    const syndicateDeals = await prisma.syndicateDeal.findMany({
      where: {
        organizationId: null, // Only deals not yet linked
      },
      select: {
        id: true,
        companyName: true,
        market: true,
        investDate: true,
      },
    });

    // Group by company name to get unique companies
    const companiesMap = new Map<string, {
      companyName: string;
      market: string | null;
      dealIds: string[];
      earliestInvestDate: Date | null;
    }>();

    for (const deal of syndicateDeals) {
      const key = deal.companyName.toLowerCase().trim();
      const existing = companiesMap.get(key);

      if (existing) {
        existing.dealIds.push(deal.id);
        if (deal.investDate && (!existing.earliestInvestDate || deal.investDate < existing.earliestInvestDate)) {
          existing.earliestInvestDate = deal.investDate;
        }
      } else {
        companiesMap.set(key, {
          companyName: deal.companyName,
          market: deal.market,
          dealIds: [deal.id],
          earliestInvestDate: deal.investDate,
        });
      }
    }

    const results = {
      organizationsCreated: 0,
      organizationsLinked: 0,
      dealsLinked: 0,
      errors: [] as string[],
    };

    // Process each unique company
    for (const [_, company] of companiesMap) {
      try {
        const canonicalKey = generateCanonicalKey(company.companyName);

        // Check if organization already exists
        let organization = await prisma.organization.findFirst({
          where: {
            OR: [
              { canonicalKey },
              { name: { equals: company.companyName, mode: 'insensitive' } },
            ],
          },
        });

        if (!organization) {
          // Create new organization
          organization = await prisma.organization.create({
            data: {
              name: company.companyName,
              canonicalKey,
              organizationType: 'PORTFOLIO',
              privacyTier: 'INTERNAL',
              industry: company.market || undefined,
            },
          });
          results.organizationsCreated++;
        } else {
          results.organizationsLinked++;
        }

        // Link all syndicate deals to this organization
        await prisma.syndicateDeal.updateMany({
          where: {
            id: { in: company.dealIds },
          },
          data: {
            organizationId: organization.id,
          },
        });
        results.dealsLinked += company.dealIds.length;

      } catch (error) {
        results.errors.push(
          `Error processing ${company.companyName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      totalCompanies: companiesMap.size,
    });
  } catch (error) {
    console.error('Failed to sync syndicate organizations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync organizations' },
      { status: 500 }
    );
  }
}
