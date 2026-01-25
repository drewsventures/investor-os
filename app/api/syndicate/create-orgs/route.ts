/**
 * Syndicate Create Organizations API
 * POST - Create organizations from syndicate deals that don't have one
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Extract domain from company name (basic heuristic)
function guessDomain(companyName: string): string | null {
  // Clean the name
  const cleaned = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '');

  if (cleaned.length > 3) {
    return `${cleaned}.com`;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';
    const onlyCoSyndicate = searchParams.get('onlyCoSyndicate') === 'true';

    // Get all syndicate deals without organization links
    const whereClause: Record<string, unknown> = {
      organizationId: null,
    };

    if (onlyCoSyndicate) {
      whereClause.isHostedDeal = false;
    }

    const dealsWithoutOrgs = await prisma.syndicateDeal.findMany({
      where: whereClause,
      orderBy: { companyName: 'asc' },
    });

    // Group by company name (some companies may have multiple deals)
    const companiesMap = new Map<string, typeof dealsWithoutOrgs>();
    for (const deal of dealsWithoutOrgs) {
      const key = deal.companyName.toLowerCase().trim();
      if (!companiesMap.has(key)) {
        companiesMap.set(key, []);
      }
      companiesMap.get(key)!.push(deal);
    }

    // Check for existing organizations that match by name
    const existingOrgs = await prisma.organization.findMany({
      select: { id: true, name: true },
    });

    const existingOrgsByName = new Map(
      existingOrgs.map(o => [o.name.toLowerCase().trim(), o])
    );

    const results = {
      totalDealsWithoutOrg: dealsWithoutOrgs.length,
      uniqueCompanies: companiesMap.size,
      created: 0,
      linked: 0,
      skipped: 0,
      errors: [] as string[],
      preview: [] as Array<{
        companyName: string;
        dealCount: number;
        action: 'create' | 'link' | 'skip';
        existingOrgId?: string;
        isHosted: boolean;
        leadSyndicate?: string | null;
      }>,
    };

    for (const [companyKey, deals] of companiesMap) {
      const firstDeal = deals[0];
      const companyName = firstDeal.companyName;

      // Check if org already exists
      const existingOrg = existingOrgsByName.get(companyKey);

      if (existingOrg) {
        // Link to existing org
        results.preview.push({
          companyName,
          dealCount: deals.length,
          action: 'link',
          existingOrgId: existingOrg.id,
          isHosted: firstDeal.isHostedDeal,
          leadSyndicate: firstDeal.leadSyndicate,
        });

        if (!dryRun) {
          try {
            await prisma.syndicateDeal.updateMany({
              where: {
                id: { in: deals.map(d => d.id) },
              },
              data: { organizationId: existingOrg.id },
            });
            results.linked += deals.length;
          } catch (error) {
            results.errors.push(`Failed to link ${companyName}: ${error}`);
          }
        } else {
          results.linked += deals.length;
        }
      } else {
        // Create new org
        results.preview.push({
          companyName,
          dealCount: deals.length,
          action: 'create',
          isHosted: firstDeal.isHostedDeal,
          leadSyndicate: firstDeal.leadSyndicate,
        });

        if (!dryRun) {
          try {
            const org = await prisma.organization.create({
              data: {
                name: companyName,
                canonicalKey: companyKey.replace(/\s+/g, '-'),
                domain: firstDeal.companyDomain || guessDomain(companyName),
                organizationType: 'PORTFOLIO',
                industry: firstDeal.market || null,
                privacyTier: 'INTERNAL',
              },
            });

            // Link all deals for this company to the new org
            await prisma.syndicateDeal.updateMany({
              where: {
                id: { in: deals.map(d => d.id) },
              },
              data: { organizationId: org.id },
            });

            results.created++;
            results.linked += deals.length;
          } catch (error) {
            results.errors.push(`Failed to create org for ${companyName}: ${error}`);
          }
        } else {
          results.created++;
        }
      }
    }

    // Get summary of lead syndicates for co-syndicates
    const leadSyndicateSummary = results.preview
      .filter(p => !p.isHosted && p.leadSyndicate)
      .reduce((acc, p) => {
        const lead = p.leadSyndicate!;
        acc[lead] = (acc[lead] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      dryRun,
      message: dryRun
        ? `Preview: Would create ${results.created} organizations and link ${results.linked} deals`
        : `Created ${results.created} organizations and linked ${results.linked} deals`,
      results: {
        ...results,
        leadSyndicateSummary,
      },
    });
  } catch (error) {
    console.error('Failed to create organizations from syndicate deals:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create organizations' },
      { status: 500 }
    );
  }
}

// GET - Preview what would be created
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const onlyCoSyndicate = searchParams.get('onlyCoSyndicate') === 'true';

  try {
    const whereClause: Record<string, unknown> = {
      organizationId: null,
    };

    if (onlyCoSyndicate) {
      whereClause.isHostedDeal = false;
    }

    const dealsWithoutOrgs = await prisma.syndicateDeal.findMany({
      where: whereClause,
      orderBy: { companyName: 'asc' },
    });

    // Group by company name
    const companiesMap = new Map<string, typeof dealsWithoutOrgs>();
    for (const deal of dealsWithoutOrgs) {
      const key = deal.companyName.toLowerCase().trim();
      if (!companiesMap.has(key)) {
        companiesMap.set(key, []);
      }
      companiesMap.get(key)!.push(deal);
    }

    // Check for existing organizations
    const existingOrgs = await prisma.organization.findMany({
      select: { id: true, name: true },
    });

    const existingOrgsByName = new Map(
      existingOrgs.map(o => [o.name.toLowerCase().trim(), o])
    );

    const preview = [];
    let wouldCreate = 0;
    let wouldLink = 0;

    for (const [companyKey, deals] of companiesMap) {
      const firstDeal = deals[0];
      const existingOrg = existingOrgsByName.get(companyKey);

      preview.push({
        companyName: firstDeal.companyName,
        dealCount: deals.length,
        hasExistingOrg: !!existingOrg,
        existingOrgId: existingOrg?.id || null,
        isHosted: firstDeal.isHostedDeal,
        leadSyndicate: firstDeal.leadSyndicate,
        market: firstDeal.market,
        invested: deals.reduce((sum, d) => sum + Number(d.invested || 0), 0),
      });

      if (existingOrg) {
        wouldLink += deals.length;
      } else {
        wouldCreate++;
        wouldLink += deals.length;
      }
    }

    // Group by lead syndicate
    const byLeadSyndicate = preview
      .filter(p => !p.isHosted && p.leadSyndicate)
      .reduce((acc, p) => {
        const lead = p.leadSyndicate!;
        if (!acc[lead]) {
          acc[lead] = { count: 0, invested: 0 };
        }
        acc[lead].count++;
        acc[lead].invested += p.invested;
        return acc;
      }, {} as Record<string, { count: number; invested: number }>);

    return NextResponse.json({
      summary: {
        totalDealsWithoutOrg: dealsWithoutOrgs.length,
        uniqueCompanies: companiesMap.size,
        wouldCreateOrgs: wouldCreate,
        wouldLinkDeals: wouldLink,
        hostedCount: preview.filter(p => p.isHosted).length,
        coSyndicateCount: preview.filter(p => !p.isHosted).length,
      },
      byLeadSyndicate,
      preview: preview.slice(0, 50), // First 50 for preview
    });
  } catch (error) {
    console.error('Failed to preview syndicate organizations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to preview' },
      { status: 500 }
    );
  }
}
