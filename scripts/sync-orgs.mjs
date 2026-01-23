/**
 * Sync syndicate companies to Organizations
 * Run with: node scripts/sync-orgs.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateCanonicalKey(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  console.log('Starting syndicate organization sync...');

  // Get all syndicate deals not yet linked to organizations
  const syndicateDeals = await prisma.syndicateDeal.findMany({
    where: {
      organizationId: null,
    },
    select: {
      id: true,
      companyName: true,
      market: true,
      investDate: true,
    },
  });

  console.log(`Found ${syndicateDeals.length} unlinked syndicate deals`);

  // Group by company name
  const companiesMap = new Map();

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

  console.log(`Found ${companiesMap.size} unique companies`);

  const results = {
    organizationsCreated: 0,
    organizationsLinked: 0,
    dealsLinked: 0,
    errors: [],
  };

  // Process each company
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
        console.log(`Created organization: ${company.companyName}`);
      } else {
        results.organizationsLinked++;
        console.log(`Found existing organization: ${company.companyName}`);
      }

      // Link syndicate deals
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
      const errMsg = `Error processing ${company.companyName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.errors.push(errMsg);
      console.error(errMsg);
    }
  }

  console.log('\n=== Sync Complete ===');
  console.log(`Organizations created: ${results.organizationsCreated}`);
  console.log(`Organizations linked (existing): ${results.organizationsLinked}`);
  console.log(`Deals linked: ${results.dealsLinked}`);
  console.log(`Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(e => console.log(`  - ${e}`));
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
