/**
 * Re-link existing emails to People and Organizations
 * Run this after updating organization domains or person emails
 */

import { prisma } from '../lib/db';
import { extractDomain, isCommonEmailProvider, findPersonByEmail, findOrgByDomain } from '../lib/gmail/entity-linker';

async function main() {
  console.log('Re-linking emails to entities...\n');

  // Get all emails
  const emails = await prisma.emailMessage.findMany({
    select: {
      id: true,
      fromEmail: true,
      toEmails: true,
      ccEmails: true,
    }
  });

  console.log(`Processing ${emails.length} emails...\n`);

  let personLinksCreated = 0;
  let orgLinksCreated = 0;
  let emailsProcessed = 0;

  // Get existing links to avoid duplicates
  const existingPersonLinks = await prisma.emailPersonLink.findMany({
    select: { emailId: true, personId: true }
  });
  const existingPersonLinkSet = new Set(
    existingPersonLinks.map(l => `${l.emailId}:${l.personId}`)
  );

  const existingOrgLinks = await prisma.emailOrgLink.findMany({
    select: { emailId: true, organizationId: true }
  });
  const existingOrgLinkSet = new Set(
    existingOrgLinks.map(l => `${l.emailId}:${l.organizationId}`)
  );

  // Track which orgs we've already looked up domains for
  const domainToOrgId = new Map<string, string | null>();

  for (const email of emails) {
    const allAddresses: Array<{ email: string; role: 'from' | 'to' | 'cc' }> = [];

    if (email.fromEmail) {
      allAddresses.push({ email: email.fromEmail, role: 'from' });
    }
    email.toEmails.forEach(addr => {
      allAddresses.push({ email: addr, role: 'to' });
    });
    email.ccEmails.forEach(addr => {
      allAddresses.push({ email: addr, role: 'cc' });
    });

    const linkedOrgIds = new Set<string>();

    for (const { email: addr, role } of allAddresses) {
      // Try to link to person
      const personId = await findPersonByEmail(addr);
      if (personId) {
        const linkKey = `${email.id}:${personId}`;
        if (!existingPersonLinkSet.has(linkKey)) {
          await prisma.emailPersonLink.create({
            data: {
              emailId: email.id,
              personId,
              role,
              emailAddress: addr
            }
          });
          existingPersonLinkSet.add(linkKey);
          personLinksCreated++;
        }
      }

      // Try to link to organization by domain
      const domain = extractDomain(addr);
      if (domain && !isCommonEmailProvider(domain)) {
        // Check cache first
        if (!domainToOrgId.has(domain)) {
          const orgId = await findOrgByDomain(domain);
          domainToOrgId.set(domain, orgId);
        }

        const orgId = domainToOrgId.get(domain);
        if (orgId && !linkedOrgIds.has(orgId)) {
          const linkKey = `${email.id}:${orgId}`;
          if (!existingOrgLinkSet.has(linkKey)) {
            await prisma.emailOrgLink.create({
              data: {
                emailId: email.id,
                organizationId: orgId
              }
            });
            existingOrgLinkSet.add(linkKey);
            orgLinksCreated++;
            linkedOrgIds.add(orgId);
          }
        }
      }
    }

    emailsProcessed++;
    if (emailsProcessed % 50 === 0) {
      console.log(`Processed ${emailsProcessed}/${emails.length} emails...`);
    }
  }

  console.log('\n=== Results ===');
  console.log(`Emails processed: ${emailsProcessed}`);
  console.log(`New person links created: ${personLinksCreated}`);
  console.log(`New organization links created: ${orgLinksCreated}`);

  // Show what got linked
  if (orgLinksCreated > 0) {
    console.log('\nOrganizations linked:');
    const linkedOrgs = await prisma.emailOrgLink.findMany({
      include: { organization: { select: { name: true } } },
      distinct: ['organizationId']
    });
    linkedOrgs.forEach(l => {
      console.log(`  - ${l.organization.name}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
