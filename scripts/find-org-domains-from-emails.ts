/**
 * Find organization domains from email history
 *
 * For each organization without a domain:
 * 1. Search emails for mentions of the company name
 * 2. Extract domains from matching senders
 * 3. Use fuzzy matching to find likely domain matches
 * 4. Update organizations with discovered domains
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
  'calendly.com', 'zoom.us', 'loom.com',
  // Service providers (not company domains)
  'e.myfilingservices.com', 'myfilingservices.com',
  'ct.com', 'ctcorporation.com',
  'gusto.com', 'rippling.com', 'justworks.com',
  'stripe.com', 'brex.com', 'mercury.com',
  'carta.com', 'pulley.com', 'clerky.com',
  'nd.edu', 'stanford.edu', 'mit.edu', 'harvard.edu', // Universities
  'storybrandstudiohub.com', 'dust.help', 'dust.tt',
  // Marketing/Newsletter services
  'e.eurostar.com', 'eurostar.com',
  'go.bitgo.com', 'tm.bitgo.com', 'bitgo.com',
  'chain.link', 'chainlink.com',
  'sbcgaming.com', 'box.com',
  'reply-sg.angellist.com',
  'usesignblueinkhq.com',
  'bradymartzwealth.com',
  'tompkinsventures.com',
  'epicweb3.com',
  'tbdshop.io',
  'form.space',
  'wagmiventures.io', // This is a VC, not WAGMI United
  'cohencm.com', // False positive for IAN
  'e.ufc.com', 'ufc.com',
  'e.read.ai', 'read.ai',
]);

function extractDomain(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  if (!match) return null;
  const domain = match[1].toLowerCase();
  if (COMMON_PROVIDERS.has(domain)) return null;
  // Skip subdomains of common services
  if (domain.includes('.google.com')) return null;
  if (domain.includes('mail.')) return null;
  return domain;
}

function normalizeForMatching(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
    .replace(/inc$/, '')
    .replace(/llc$/, '')
    .replace(/corp$/, '')
    .replace(/labs$/, '')
    .replace(/io$/, '')
    .replace(/ai$/, '')
    .replace(/co$/, '');
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeForMatching(str1);
  const s2 = normalizeForMatching(str2);

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  // Check if one contains the other's first significant part
  const s1First = s1.substring(0, Math.min(s1.length, 6));
  const s2First = s2.substring(0, Math.min(s2.length, 6));

  if (s1First.length >= 4 && s2.includes(s1First)) return 0.8;
  if (s2First.length >= 4 && s1.includes(s2First)) return 0.8;

  // Levenshtein-ish similarity for short strings
  if (s1.length < 10 && s2.length < 10) {
    let matches = 0;
    for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
      if (s1[i] === s2[i]) matches++;
    }
    return matches / Math.max(s1.length, s2.length);
  }

  return 0;
}

interface DomainCandidate {
  domain: string;
  score: number;
  fromName: string | null;
  email: string;
  matchType: string;
}

async function findDomainCandidates(
  orgName: string,
  emails: Array<{ fromEmail: string | null; fromName: string | null; subject: string | null }>
): Promise<DomainCandidate[]> {
  const candidates: DomainCandidate[] = [];
  const normalizedOrgName = normalizeForMatching(orgName);

  // Get primary word (first significant word, at least 4 chars)
  const orgWords = orgName.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
  const primaryWord = orgWords.find(w => w.length >= 4) || orgWords[0] || '';

  // Skip if org name is too short/generic
  if (primaryWord.length < 3) return candidates;

  for (const email of emails) {
    if (!email.fromEmail) continue;

    const domain = extractDomain(email.fromEmail);
    if (!domain) continue;

    const domainBase = domain.split('.')[0].toLowerCase();

    // Method 1: Domain base exactly matches or contains the primary org word
    if (primaryWord.length >= 4) {
      // Exact match in domain
      if (domainBase === primaryWord || domainBase === normalizedOrgName) {
        candidates.push({
          domain,
          score: 1.0,
          fromName: email.fromName,
          email: email.fromEmail,
          matchType: 'exact-domain-match'
        });
        continue;
      }

      // Domain contains the primary word (e.g., "stardust" in "stardustgg.com")
      if (domainBase.includes(primaryWord) && primaryWord.length >= 5) {
        candidates.push({
          domain,
          score: 0.95,
          fromName: email.fromName,
          email: email.fromEmail,
          matchType: 'domain-contains-name'
        });
        continue;
      }
    }

    // Method 2: From name exactly contains org name
    if (email.fromName) {
      const fromNameLower = email.fromName.toLowerCase();

      // From name contains the full org name or primary word
      if (fromNameLower.includes(orgName.toLowerCase()) ||
          (primaryWord.length >= 5 && fromNameLower.includes(primaryWord))) {
        candidates.push({
          domain,
          score: 0.9,
          fromName: email.fromName,
          email: email.fromEmail,
          matchType: 'from-name-contains-org'
        });
        continue;
      }

      // From name starts with org name word
      const fromWords = fromNameLower.split(/\s+/);
      if (fromWords[0] === primaryWord && primaryWord.length >= 4) {
        candidates.push({
          domain,
          score: 0.85,
          fromName: email.fromName,
          email: email.fromEmail,
          matchType: 'from-name-starts-with-org'
        });
        continue;
      }
    }

    // Method 3: High similarity between domain and org name
    const domainSimilarity = calculateSimilarity(orgName, domainBase);
    if (domainSimilarity >= 0.85) {
      candidates.push({
        domain,
        score: domainSimilarity * 0.9,
        fromName: email.fromName,
        email: email.fromEmail,
        matchType: 'high-similarity'
      });
    }
  }

  // Dedupe and sort by score
  const seen = new Set<string>();
  return candidates
    .filter(c => {
      if (seen.has(c.domain)) return false;
      seen.add(c.domain);
      return true;
    })
    .sort((a, b) => b.score - a.score);
}

async function main() {
  const dryRun = !process.argv.includes('--apply');

  console.log('Finding organization domains from email history...\n');
  if (dryRun) {
    console.log('DRY RUN - use --apply to save changes\n');
  }

  // Get organizations without domains (prioritize portfolio)
  const orgsWithoutDomain = await prisma.organization.findMany({
    where: { domain: null },
    select: { id: true, name: true, organizationType: true },
    orderBy: [
      { organizationType: 'asc' }, // PORTFOLIO comes first alphabetically
    ]
  });

  console.log(`Found ${orgsWithoutDomain.length} organizations without domains.\n`);

  // Get all emails for searching
  const emails = await prisma.emailMessage.findMany({
    select: {
      fromEmail: true,
      fromName: true,
      subject: true,
    }
  });

  console.log(`Searching through ${emails.length} emails...\n`);

  let found = 0;
  let notFound = 0;
  const results: Array<{ org: string; domain: string; confidence: number; matchType: string }> = [];

  for (const org of orgsWithoutDomain) {
    const candidates = await findDomainCandidates(org.name, emails);

    if (candidates.length > 0 && candidates[0].score >= 0.9) {
      const best = candidates[0];
      results.push({
        org: org.name,
        domain: best.domain,
        confidence: best.score,
        matchType: best.matchType
      });

      console.log(`[FOUND] ${org.name}`);
      console.log(`  Domain: ${best.domain} (${(best.score * 100).toFixed(0)}% confidence)`);
      console.log(`  Match type: ${best.matchType}`);
      console.log(`  From: ${best.fromName || best.email}`);

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
      // Show low-confidence matches for review
      console.log(`[LOW CONFIDENCE] ${org.name}`);
      candidates.slice(0, 2).forEach(c => {
        console.log(`  ? ${c.domain} (${(c.score * 100).toFixed(0)}%) - ${c.matchType}`);
      });
      console.log('');
      notFound++;
    } else {
      notFound++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Domains found: ${found}`);
  console.log(`Not found: ${notFound}`);

  if (dryRun && found > 0) {
    console.log('\nTo apply changes, run: npx tsx scripts/find-org-domains-from-emails.ts --apply');
  }

  // Also link emails to organizations with new domains
  if (!dryRun && found > 0) {
    console.log('\n\nLinking emails to updated organizations...\n');

    for (const result of results) {
      const org = await prisma.organization.findFirst({
        where: { domain: result.domain },
        select: { id: true, name: true }
      });

      if (!org) continue;

      const matchingEmails = await prisma.emailMessage.findMany({
        where: {
          fromEmail: { endsWith: `@${result.domain}`, mode: 'insensitive' }
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
