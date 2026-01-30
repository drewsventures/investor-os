/**
 * Check potential domain matches between emails and organizations
 */

import { prisma } from '../lib/db';

const COMMON_PROVIDERS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com',
  'hotmail.com', 'me.com', 'icloud.com', 'aol.com'
];

async function main() {
  // Get sample of org domains
  const orgs = await prisma.organization.findMany({
    where: { domain: { not: null } },
    select: { name: true, domain: true },
    take: 20
  });

  console.log('Sample Organization domains:');
  orgs.forEach((o) => {
    console.log(`  ${o.name} -> ${o.domain}`);
  });

  // Get all email domains from synced emails
  const emails = await prisma.emailMessage.findMany({
    select: { fromEmail: true }
  });

  const emailDomains = new Set<string>();
  emails.forEach((e) => {
    if (e.fromEmail) {
      const domain = e.fromEmail.split('@')[1]?.toLowerCase();
      if (domain && !COMMON_PROVIDERS.includes(domain)) {
        emailDomains.add(domain);
      }
    }
  });

  console.log('\n');
  console.log('Email domains from synced emails:', emailDomains.size);
  console.log('Sample:', Array.from(emailDomains).slice(0, 20).join(', '));

  // Get all orgs with domains
  const allOrgs = await prisma.organization.findMany({
    where: { domain: { not: null } },
    select: { id: true, name: true, domain: true }
  });

  // Normalize org domains for matching
  const orgDomainMap = new Map<string, { id: string; name: string; domain: string }>();
  allOrgs.forEach((org) => {
    if (!org.domain) return;
    const normalized = org.domain.toLowerCase()
      .replace(/^www\./, '')
      .replace(/^mail\./, '')
      .replace(/^em\d+\./, ''); // Remove sendgrid-style prefixes
    orgDomainMap.set(normalized, { ...org, domain: org.domain });

    // Also add base domain without subdomain
    const parts = normalized.split('.');
    if (parts.length > 2) {
      const baseDomain = parts.slice(-2).join('.');
      if (!orgDomainMap.has(baseDomain)) {
        orgDomainMap.set(baseDomain, { ...org, domain: org.domain });
      }
    }
  });

  console.log('\n');
  console.log('Checking for matches with normalized domains...');

  const matches: Array<{ emailDomain: string; org: string; orgDomain: string }> = [];

  emailDomains.forEach((emailDomain) => {
    // Try direct match
    if (orgDomainMap.has(emailDomain)) {
      const org = orgDomainMap.get(emailDomain)!;
      matches.push({ emailDomain, org: org.name, orgDomain: org.domain! });
      return;
    }

    // Try without subdomain
    const parts = emailDomain.split('.');
    if (parts.length > 2) {
      const baseDomain = parts.slice(-2).join('.');
      if (orgDomainMap.has(baseDomain)) {
        const org = orgDomainMap.get(baseDomain)!;
        matches.push({ emailDomain, org: org.name, orgDomain: org.domain! });
      }
    }
  });

  console.log('\n');
  console.log('Matches found:', matches.length);
  matches.forEach((m) => {
    console.log(`  ${m.emailDomain} -> ${m.org} (stored as: ${m.orgDomain})`);
  });

  // Show unmatched domains
  const matchedDomains = new Set(matches.map(m => m.emailDomain));
  const unmatched = Array.from(emailDomains).filter(d => !matchedDomains.has(d));

  console.log('\n');
  console.log('Unmatched domains (' + unmatched.length + '):');
  unmatched.slice(0, 30).forEach(d => console.log(`  ${d}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
