/**
 * Fix incorrectly linked investor updates
 *
 * Unlinks wrong matches and creates proper organizations
 */

import { prisma } from '../lib/db';
import { UpdateType, OrganizationType } from '@prisma/client';

// Known incorrect links to fix
const FIXES: Record<string, { correctOrg: string; domain?: string; createIfMissing: boolean }> = {
  'FORM - December 2025': { correctOrg: 'FORM', domain: 'formyourbody.com', createIfMissing: true },
  'TRON - Q4 2025': { correctOrg: 'TRON', domain: 'tron.network', createIfMissing: true },
  'Compass - January 2026': { correctOrg: 'Compass', domain: 'compass.com', createIfMissing: true },
  'Bynh - Q4 2025': { correctOrg: 'Bynh', domain: 'bynh.sa', createIfMissing: true },
  'Block Asset Management S.à r.l. - December 2025': { correctOrg: 'Block Asset Management', domain: 'blockassetmanagement.com', createIfMissing: true },
  'RAIR Technologies - null': { correctOrg: 'RAIR Technologies', domain: 'rair.tech', createIfMissing: true },
  'RAIR Technologies - January 2026': { correctOrg: 'RAIR Technologies', domain: 'rair.tech', createIfMissing: true },
  'Sundeep Ahuja Climate Capital Syndicate - Q1 2026': { correctOrg: 'Climate Capital', domain: 'climatecapital.co', createIfMissing: true },
  'Mirai Capital - January 2026': { correctOrg: 'Mirai Capital', domain: 'miraicapital.net', createIfMissing: true },
  'Chromia - Q4 2025': { correctOrg: 'Chromia', domain: 'chromia.com', createIfMissing: true },
};

async function findOrCreateOrg(name: string, domain?: string): Promise<string | null> {
  // Try exact name match first
  let org = await prisma.organization.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } }
  });

  if (org) return org.id;

  // Try domain match
  if (domain) {
    org = await prisma.organization.findFirst({
      where: { domain: { equals: domain, mode: 'insensitive' } }
    });
    if (org) return org.id;
  }

  // Create if allowed
  if (domain) {
    console.log(`  Creating organization: ${name} (${domain})`);
    const newOrg = await prisma.organization.create({
      data: {
        name,
        canonicalKey: domain,
        domain,
        organizationType: OrganizationType.PROSPECT,
      }
    });
    return newOrg.id;
  }

  return null;
}

async function main() {
  console.log('Fixing investor update links...\n');

  // Get all investor updates
  const updates = await prisma.update.findMany({
    where: { type: UpdateType.INVESTOR_UPDATE },
    include: { organization: { select: { id: true, name: true } } }
  });

  for (const update of updates) {
    const fix = FIXES[update.title || ''];

    if (!fix) {
      // Check if the current link makes sense
      const metadata = update.metadata as { companyName?: string } | null;
      const aiCompanyName = metadata?.companyName;
      const linkedName = update.organization?.name;

      if (aiCompanyName && linkedName) {
        const aiWords = aiCompanyName.toLowerCase().split(' ').filter(w => w.length > 2);
        const linkedWords = linkedName.toLowerCase().split(' ').filter(w => w.length > 2);
        const hasMatch = aiWords.some(w => linkedWords.some(l => l.includes(w) || w.includes(l)));

        if (!hasMatch) {
          console.log(`[SUSPICIOUS] ${update.title} -> ${linkedName} (AI said: ${aiCompanyName})`);
          // Unlink suspicious matches
          await prisma.update.update({
            where: { id: update.id },
            data: { organizationId: null }
          });
          console.log('  Unlinked for manual review');
        }
      }
      continue;
    }

    console.log(`[FIXING] ${update.title}`);
    console.log(`  Current: ${update.organization?.name || 'none'}`);
    console.log(`  Correct: ${fix.correctOrg}`);

    const correctOrgId = await findOrCreateOrg(fix.correctOrg, fix.domain);

    if (correctOrgId && correctOrgId !== update.organization?.id) {
      await prisma.update.update({
        where: { id: update.id },
        data: { organizationId: correctOrgId }
      });
      console.log('  Fixed!');
    } else if (!correctOrgId) {
      console.log('  Could not find/create org');
    } else {
      console.log('  Already correct');
    }
  }

  // Now link emails to the newly created organizations
  console.log('\n\nLinking emails to new organizations...\n');

  const orgsWithDomains = await prisma.organization.findMany({
    where: { domain: { not: null } },
    select: { id: true, domain: true, name: true }
  });

  for (const org of orgsWithDomains) {
    if (!org.domain) continue;

    const existingLinks = await prisma.emailOrgLink.count({
      where: { organizationId: org.id }
    });

    if (existingLinks > 0) continue;

    const matchingEmails = await prisma.emailMessage.findMany({
      where: {
        fromEmail: { endsWith: `@${org.domain}`, mode: 'insensitive' }
      },
      select: { id: true }
    });

    if (matchingEmails.length > 0) {
      console.log(`Linking ${matchingEmails.length} emails to ${org.name}`);
      await prisma.emailOrgLink.createMany({
        data: matchingEmails.map(e => ({
          emailId: e.id,
          organizationId: org.id
        })),
        skipDuplicates: true
      });
    }
  }

  console.log('\nDone!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
