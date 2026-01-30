/**
 * Link investor updates to organizations using email domains
 *
 * For each unlinked investor update:
 * 1. Extract the sender's email domain
 * 2. Find or create an organization with that domain
 * 3. Link the update to the organization
 */

import { prisma } from '../lib/db';
import { UpdateType, OrganizationType } from '@prisma/client';

// Common email providers to skip
const COMMON_PROVIDERS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com',
  'hotmail.com', 'me.com', 'icloud.com', 'aol.com', 'protonmail.com',
  'angellist.com', 'docsend.com', 'docusign.com', 'docusign.net',
  'slack.com', 'notion.so'
]);

function extractDomain(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  if (!match) return null;
  const domain = match[1].toLowerCase();
  // Skip subdomains of common services
  if (domain.includes('angellist.com')) return null;
  if (domain.includes('docusign')) return null;
  if (COMMON_PROVIDERS.has(domain)) return null;
  return domain;
}

async function main() {
  console.log('Linking investor updates to organizations by domain...\n');

  // Get all investor updates
  const updates = await prisma.update.findMany({
    where: { type: UpdateType.INVESTOR_UPDATE },
    select: {
      id: true,
      title: true,
      organizationId: true,
      metadata: true,
    }
  });

  console.log(`Found ${updates.length} investor updates.\n`);

  // Get all emails to build domain lookup
  const emails = await prisma.emailMessage.findMany({
    select: {
      id: true,
      fromEmail: true,
      fromName: true,
    }
  });

  // Build email ID to domain map
  const emailToDomain = new Map<string, { domain: string; fromName: string | null }>();
  emails.forEach(e => {
    if (e.fromEmail) {
      const domain = extractDomain(e.fromEmail);
      if (domain) {
        emailToDomain.set(e.id, { domain, fromName: e.fromName });
      }
    }
  });

  // Get all organizations for lookup
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, domain: true }
  });

  // Build domain to org map
  const domainToOrg = new Map<string, { id: string; name: string }>();
  orgs.forEach(o => {
    if (o.domain) {
      domainToOrg.set(o.domain.toLowerCase(), { id: o.id, name: o.name });
    }
  });

  // Build name to org map (for fuzzy matching)
  const nameToOrg = new Map<string, { id: string; name: string }>();
  orgs.forEach(o => {
    nameToOrg.set(o.name.toLowerCase(), { id: o.id, name: o.name });
  });

  let linked = 0;
  let created = 0;
  let alreadyLinked = 0;
  let skipped = 0;

  for (const update of updates) {
    // Skip if already linked
    if (update.organizationId) {
      alreadyLinked++;
      continue;
    }

    const metadata = update.metadata as { emailId?: string; companyName?: string } | null;
    if (!metadata?.emailId) {
      console.log(`[SKIP] No email ID: ${update.title}`);
      skipped++;
      continue;
    }

    const emailInfo = emailToDomain.get(metadata.emailId);
    const companyName = metadata.companyName;

    console.log(`\n[PROCESSING] ${update.title}`);
    console.log(`  Company from AI: ${companyName || 'unknown'}`);
    console.log(`  Email domain: ${emailInfo?.domain || 'unknown'}`);

    let orgId: string | null = null;
    let orgName: string | null = null;

    // Try to find org by domain first
    if (emailInfo?.domain) {
      const org = domainToOrg.get(emailInfo.domain);
      if (org) {
        orgId = org.id;
        orgName = org.name;
        console.log(`  Found by domain: ${orgName}`);
      }
    }

    // Try to find org by company name
    if (!orgId && companyName) {
      // Try exact match
      const exactOrg = nameToOrg.get(companyName.toLowerCase());
      if (exactOrg) {
        orgId = exactOrg.id;
        orgName = exactOrg.name;
        console.log(`  Found by name: ${orgName}`);
      } else {
        // Try fuzzy match (first word)
        const firstWord = companyName.split(' ')[0].toLowerCase();
        if (firstWord.length > 3) {
          for (const [name, org] of nameToOrg) {
            if (name.includes(firstWord) || firstWord.includes(name.split(' ')[0])) {
              orgId = org.id;
              orgName = org.name;
              console.log(`  Found by fuzzy match: ${orgName}`);
              break;
            }
          }
        }
      }
    }

    // If still not found and we have domain + company name, create the org
    if (!orgId && emailInfo?.domain && companyName && companyName !== 'null') {
      console.log(`  Creating new organization: ${companyName} (${emailInfo.domain})`);

      const newOrg = await prisma.organization.create({
        data: {
          name: companyName,
          canonicalKey: emailInfo.domain,
          domain: emailInfo.domain,
          organizationType: OrganizationType.PROSPECT,
        }
      });

      orgId = newOrg.id;
      orgName = companyName;
      created++;

      // Add to lookup maps
      domainToOrg.set(emailInfo.domain, { id: newOrg.id, name: companyName });
      nameToOrg.set(companyName.toLowerCase(), { id: newOrg.id, name: companyName });
    }

    // Link the update
    if (orgId) {
      await prisma.update.update({
        where: { id: update.id },
        data: { organizationId: orgId }
      });
      console.log(`  [LINKED] to ${orgName}`);
      linked++;
    } else {
      console.log(`  [SKIPPED] Could not find or create organization`);
      skipped++;
    }
  }

  // Also link emails to these new organizations
  console.log('\n\nNow re-linking emails to new organizations...\n');

  // Get newly created orgs
  const newOrgs = await prisma.organization.findMany({
    where: {
      domain: { not: null },
      emailLinks: { none: {} }
    },
    select: { id: true, domain: true, name: true }
  });

  for (const org of newOrgs) {
    if (!org.domain) continue;

    // Find emails from this domain
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

  console.log('\n=== Summary ===');
  console.log(`Already linked: ${alreadyLinked}`);
  console.log(`Newly linked: ${linked}`);
  console.log(`Organizations created: ${created}`);
  console.log(`Skipped: ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
