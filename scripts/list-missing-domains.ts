import { prisma } from '../lib/db';

async function main() {
  const orgs = await prisma.organization.findMany({
    where: { domain: null },
    select: { name: true, organizationType: true },
    orderBy: [
      { organizationType: 'asc' },
      { name: 'asc' }
    ]
  });

  console.log(`=== Organizations Still Missing Domains (${orgs.length}) ===\n`);

  // Group by type
  const byType: Record<string, string[]> = {};
  orgs.forEach((o) => {
    const type = o.organizationType || 'OTHER';
    if (!byType[type]) byType[type] = [];
    byType[type].push(o.name);
  });

  Object.keys(byType).sort().forEach((type) => {
    console.log(`${type} (${byType[type].length}):`);
    byType[type].forEach((name) => {
      console.log(`  - ${name}`);
    });
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
