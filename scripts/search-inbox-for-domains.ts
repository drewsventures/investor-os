/**
 * Search inbox for company names to find associated domains
 *
 * For each organization without a domain:
 * 1. Search emails where the company name appears in subject or body
 * 2. Extract sender domains from those emails
 * 3. Find the most likely company domain
 */

import { prisma } from '../lib/db';

// Common email providers to skip
const COMMON_PROVIDERS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com',
  'hotmail.com', 'me.com', 'icloud.com', 'aol.com', 'protonmail.com',
  'proton.me', 'hey.com', 'fastmail.com', 'zoho.com',
  // Common services
  'angellist.com', 'docsend.com', 'docusign.com', 'docusign.net',
  'slack.com', 'notion.so', 'google.com', 'linkedin.com',
  'calendly.com', 'zoom.us', 'loom.com', 'substack.com',
  // Your own domains
  'redbeard.ventures', 'denariilabs.xyz',
]);

// Service domains that aren't company domains
const SERVICE_DOMAINS = new Set([
  'e.myfilingservices.com', 'myfilingservices.com',
  'e.eurostar.com', 'e.ufc.com', 'e.read.ai',
  'go.bitgo.com', 'tm.bitgo.com',
  'reply-sg.angellist.com',
  'eumail.docusign.net',
]);

function extractDomain(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  if (!match) return null;
  const domain = match[1].toLowerCase();
  if (COMMON_PROVIDERS.has(domain)) return null;
  if (SERVICE_DOMAINS.has(domain)) return null;
  if (domain.startsWith('e.') || domain.startsWith('mail.')) return null;
  return domain;
}

function normalizeForSearch(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSearchTerms(orgName: string): string[] {
  const terms: string[] = [];

  // Full name
  const normalized = normalizeForSearch(orgName);
  if (normalized.length >= 3) {
    terms.push(normalized);
  }

  // Individual words (4+ chars)
  const words = normalized.split(' ').filter(w => w.length >= 4);
  terms.push(...words);

  // Remove common suffixes for variations
  const variations = [
    orgName.replace(/\s*(Labs?|Inc\.?|LLC|Corp\.?|Co\.?|Technologies?|Studios?)\s*$/i, '').trim(),
    orgName.replace(/\s*\(.*\)\s*$/i, '').trim(), // Remove parentheticals like (YC W20)
  ];

  variations.forEach(v => {
    const vNorm = normalizeForSearch(v);
    if (vNorm.length >= 3 && !terms.includes(vNorm)) {
      terms.push(vNorm);
    }
  });

  return [...new Set(terms)];
}

interface DomainCandidate {
  domain: string;
  count: number;
  matchedTerms: string[];
  sampleSubjects: string[];
}

async function main() {
  const dryRun = !process.argv.includes('--apply');

  console.log('Searching inbox for company names to find domains...\n');
  if (dryRun) {
    console.log('DRY RUN - use --apply to save changes\n');
  }

  // Get organizations without domains
  const orgsWithoutDomain = await prisma.organization.findMany({
    where: { domain: null },
    select: { id: true, name: true, organizationType: true },
    orderBy: { organizationType: 'asc' }
  });

  console.log(`Found ${orgsWithoutDomain.length} organizations without domains.\n`);

  // Get all emails
  const emails = await prisma.emailMessage.findMany({
    select: {
      fromEmail: true,
      fromName: true,
      subject: true,
      snippet: true,
    }
  });

  console.log(`Searching through ${emails.length} emails...\n`);

  let found = 0;
  let notFound = 0;

  for (const org of orgsWithoutDomain) {
    const searchTerms = getSearchTerms(org.name);
    if (searchTerms.length === 0) continue;

    const domainCounts = new Map<string, DomainCandidate>();

    // Search for emails mentioning this company
    for (const email of emails) {
      const searchText = [
        email.subject || '',
        email.fromName || '',
        email.snippet || ''
      ].join(' ').toLowerCase();

      // Check if any search term matches
      const matchedTerms = searchTerms.filter(term => searchText.includes(term));

      if (matchedTerms.length === 0) continue;

      // Extract domain from sender
      const domain = email.fromEmail ? extractDomain(email.fromEmail) : null;
      if (!domain) continue;

      // Track this domain
      if (!domainCounts.has(domain)) {
        domainCounts.set(domain, {
          domain,
          count: 0,
          matchedTerms: [],
          sampleSubjects: []
        });
      }

      const entry = domainCounts.get(domain)!;
      entry.count++;
      matchedTerms.forEach(t => {
        if (!entry.matchedTerms.includes(t)) {
          entry.matchedTerms.push(t);
        }
      });
      if (entry.sampleSubjects.length < 3 && email.subject) {
        entry.sampleSubjects.push(email.subject.substring(0, 50));
      }
    }

    // Find best candidate
    const candidates = Array.from(domainCounts.values())
      .filter(c => c.count >= 1)
      .sort((a, b) => {
        // Prefer domains that match the org name
        const aMatchesName = a.domain.split('.')[0].includes(normalizeForSearch(org.name).split(' ')[0]);
        const bMatchesName = b.domain.split('.')[0].includes(normalizeForSearch(org.name).split(' ')[0]);
        if (aMatchesName && !bMatchesName) return -1;
        if (bMatchesName && !aMatchesName) return 1;
        // Then by count
        return b.count - a.count;
      });

    if (candidates.length > 0) {
      const best = candidates[0];
      const domainBase = best.domain.split('.')[0];
      const orgBase = normalizeForSearch(org.name).split(' ')[0];

      // Check if domain looks like it belongs to this company
      const domainMatchesOrg = domainBase.includes(orgBase) || orgBase.includes(domainBase);
      const hasMultipleEmails = best.count >= 2;
      const confidence = domainMatchesOrg ? 'HIGH' : (hasMultipleEmails ? 'MEDIUM' : 'LOW');

      if (confidence === 'HIGH' || (confidence === 'MEDIUM' && best.count >= 3)) {
        console.log(`[FOUND - ${confidence}] ${org.name}`);
        console.log(`  Domain: ${best.domain} (${best.count} emails)`);
        console.log(`  Matched: ${best.matchedTerms.join(', ')}`);
        console.log(`  Sample: ${best.sampleSubjects[0] || 'N/A'}`);

        if (!dryRun) {
          await prisma.organization.update({
            where: { id: org.id },
            data: { domain: best.domain }
          });
          console.log('  [SAVED]');
        }
        console.log('');
        found++;
      } else if (candidates.length > 0) {
        console.log(`[LOW CONFIDENCE] ${org.name}`);
        candidates.slice(0, 2).forEach(c => {
          console.log(`  ? ${c.domain} (${c.count} emails) - "${c.sampleSubjects[0] || 'N/A'}"`);
        });
        console.log('');
        notFound++;
      }
    } else {
      notFound++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Domains found: ${found}`);
  console.log(`Not found/low confidence: ${notFound}`);

  if (dryRun && found > 0) {
    console.log('\nTo apply changes, run: npx tsx scripts/search-inbox-for-domains.ts --apply');
  }

  // Link emails to new organizations
  if (!dryRun && found > 0) {
    console.log('\n\nLinking emails to updated organizations...');

    const updatedOrgs = await prisma.organization.findMany({
      where: {
        domain: { not: null },
        emailLinks: { none: {} }
      },
      select: { id: true, domain: true, name: true }
    });

    for (const org of updatedOrgs) {
      if (!org.domain) continue;

      const matchingEmails = await prisma.emailMessage.findMany({
        where: {
          fromEmail: { endsWith: `@${org.domain}`, mode: 'insensitive' }
        },
        select: { id: true }
      });

      if (matchingEmails.length > 0) {
        await prisma.emailOrgLink.createMany({
          data: matchingEmails.map(e => ({
            emailId: e.id,
            organizationId: org.id
          })),
          skipDuplicates: true
        });
        console.log(`Linked ${matchingEmails.length} emails to ${org.name}`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
