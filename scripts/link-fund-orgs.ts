/**
 * Link Fund I investments to Organizations
 * Creates organizations where they don't exist and links them
 * Usage: npx tsx scripts/link-fund-orgs.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\\n🔗 Linking Fund I investments to Organizations\\n');

  // Get all fund investments without an organization link
  const investments = await prisma.fundInvestment.findMany({
    where: {
      organizationId: null,
    },
    orderBy: { companyName: 'asc' },
  });

  console.log(`Found ${investments.length} investments to link\\n`);

  const results = {
    linked: 0,
    created: 0,
    errors: [] as string[],
  };

  // Track which company names we've processed (for companies with multiple positions)
  const processedCompanies = new Set<string>();

  for (const inv of investments) {
    try {
      // Normalize company name for matching
      const companyName = inv.companyName;

      // Skip if we already processed this company (multiple positions)
      // The organization will be linked to all positions for this company
      if (processedCompanies.has(companyName)) {
        continue;
      }
      processedCompanies.add(companyName);

      // Try to find existing organization
      let org = await prisma.organization.findFirst({
        where: {
          OR: [
            { name: { equals: companyName, mode: 'insensitive' } },
            { canonicalKey: companyName.toLowerCase().replace(/\\s+/g, '-') },
          ],
        },
      });

      if (!org) {
        // Create new organization
        const canonicalKey = companyName.toLowerCase().replace(/\\s+/g, '-');

        org = await prisma.organization.create({
          data: {
            name: companyName,
            canonicalKey,
            organizationType: 'PORTFOLIO',
            industry: inv.sector || undefined,
            privacyTier: 'INTERNAL',
          },
        });
        console.log(`   ✓ Created org: ${companyName}`);
        results.created++;
      } else {
        console.log(`   → Found existing org: ${companyName}`);
      }

      // Link all investments for this company to the organization
      const updateCount = await prisma.fundInvestment.updateMany({
        where: {
          companyName: companyName,
          organizationId: null,
        },
        data: {
          organizationId: org.id,
        },
      });

      console.log(`     Linked ${updateCount.count} position(s)`);
      results.linked += updateCount.count;

      // Update organization type to PORTFOLIO if not already
      if (org.organizationType !== 'PORTFOLIO') {
        await prisma.organization.update({
          where: { id: org.id },
          data: { organizationType: 'PORTFOLIO' },
        });
      }

    } catch (error) {
      console.error(`   ✗ Error: ${inv.companyName} - ${error}`);
      results.errors.push(`${inv.companyName}: ${error}`);
    }
  }

  console.log('\\n' + '='.repeat(50));
  console.log('📈 Summary:');
  console.log(`   Organizations created: ${results.created}`);
  console.log(`   Investments linked: ${results.linked}`);
  console.log(`   Errors: ${results.errors.length}`);

  // List all portfolio companies now
  const portfolioOrgs = await prisma.organization.findMany({
    where: {
      fundInvestments: { some: {} },
    },
    include: {
      _count: {
        select: { fundInvestments: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`\\n📊 Fund I Portfolio Companies: ${portfolioOrgs.length}`);
  portfolioOrgs.forEach((org) => {
    console.log(`   • ${org.name} (${org._count.fundInvestments} position${org._count.fundInvestments > 1 ? 's' : ''})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
