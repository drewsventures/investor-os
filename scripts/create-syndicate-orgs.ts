/**
 * Create Organization records for syndicate deals that don't have one
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all syndicate deals without organization links
  const dealsWithoutOrgs = await prisma.syndicateDeal.findMany({
    where: { organizationId: null },
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
    existingOrgs.map((o) => [o.name.toLowerCase().trim(), o])
  );

  console.log('Deals without org:', dealsWithoutOrgs.length);
  console.log('Unique companies:', companiesMap.size);
  console.log('Existing orgs:', existingOrgs.length);
  console.log('');

  let created = 0;
  let linked = 0;

  for (const [companyKey, deals] of companiesMap) {
    const firstDeal = deals[0];
    const companyName = firstDeal.companyName;
    const existingOrg = existingOrgsByName.get(companyKey);

    if (existingOrg) {
      // Link to existing org
      await prisma.syndicateDeal.updateMany({
        where: { id: { in: deals.map((d) => d.id) } },
        data: { organizationId: existingOrg.id },
      });
      linked += deals.length;
      console.log('Linked:', companyName, '->', existingOrg.id);
    } else {
      // Create new org
      const org = await prisma.organization.create({
        data: {
          name: companyName,
          canonicalKey: companyKey.replace(/\s+/g, '-'),
          domain: firstDeal.companyDomain || null,
          organizationType: 'PORTFOLIO',
          industry: firstDeal.market || null,
          privacyTier: 'INTERNAL',
        },
      });

      // Link all deals for this company
      await prisma.syndicateDeal.updateMany({
        where: { id: { in: deals.map((d) => d.id) } },
        data: { organizationId: org.id },
      });

      created++;
      linked += deals.length;
      console.log('Created:', companyName, '->', org.id);
    }
  }

  console.log('\n=== Summary ===');
  console.log('Organizations created:', created);
  console.log('Deals linked:', linked);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
