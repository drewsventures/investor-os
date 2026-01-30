import { prisma } from '../lib/db';
import { UpdateType } from '@prisma/client';

async function main() {
  const updates = await prisma.update.findMany({
    where: { type: UpdateType.INVESTOR_UPDATE },
    orderBy: { updateDate: 'desc' },
    include: { organization: { select: { name: true } } }
  });

  console.log('=== Investor Updates (Timeline) ===\n');
  updates.forEach((u) => {
    const date = u.updateDate.toISOString().split('T')[0];
    const org = u.organization?.name || '(unlinked)';
    console.log(`${date} | ${org}`);
    console.log(`  ${u.title}`);
    console.log('');
  });

  console.log('\n=== Summary ===');
  console.log('Total updates:', updates.length);
  console.log('Linked:', updates.filter(u => u.organizationId).length);
  console.log('Unlinked:', updates.filter(u => !u.organizationId).length);

  // Show content of a sample update
  if (updates.length > 0) {
    console.log('\n=== Sample Update Content ===');
    const sample = updates.find(u => u.organization?.name === 'HIFI') || updates[0];
    console.log(`\nTitle: ${sample.title}`);
    console.log(`Organization: ${sample.organization?.name}`);
    console.log(`Date: ${sample.updateDate.toISOString().split('T')[0]}`);
    console.log('\nContent:');
    console.log(sample.content);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
