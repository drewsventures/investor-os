/**
 * Entity Linker
 * Links email addresses to People and email domains to Organizations
 */

import { prisma } from '@/lib/db';
import type { ParsedEmail } from './client';

export interface LinkedEntities {
  personLinks: Array<{
    personId: string;
    role: 'from' | 'to' | 'cc';
    emailAddress: string;
  }>;
  orgLinks: Array<{
    organizationId: string;
  }>;
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Common email provider domains to ignore for org matching
 */
const COMMON_EMAIL_PROVIDERS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'mail.com',
  'yandex.com',
  'fastmail.com',
  'hey.com',
]);

/**
 * Check if domain is a common email provider
 */
export function isCommonEmailProvider(domain: string): boolean {
  return COMMON_EMAIL_PROVIDERS.has(domain.toLowerCase());
}

/**
 * Find Person by email address
 */
export async function findPersonByEmail(email: string): Promise<string | null> {
  const person = await prisma.person.findFirst({
    where: {
      email: {
        equals: email,
        mode: 'insensitive',
      },
    },
    select: { id: true },
  });
  return person?.id || null;
}

/**
 * Find Organization by domain
 */
export async function findOrgByDomain(domain: string): Promise<string | null> {
  const org = await prisma.organization.findFirst({
    where: {
      domain: {
        equals: domain,
        mode: 'insensitive',
      },
    },
    select: { id: true },
  });
  return org?.id || null;
}

/**
 * Link email to entities (People and Organizations)
 */
export async function linkEmailToEntities(
  parsedEmail: ParsedEmail,
  userEmail: string
): Promise<LinkedEntities> {
  const personLinks: LinkedEntities['personLinks'] = [];
  const orgLinks: LinkedEntities['orgLinks'] = [];
  const linkedOrgIds = new Set<string>();

  // Helper to add person link
  const addPersonLink = async (
    email: string,
    role: 'from' | 'to' | 'cc'
  ) => {
    // Skip the user's own email
    if (email.toLowerCase() === userEmail.toLowerCase()) return;

    const personId = await findPersonByEmail(email);
    if (personId) {
      personLinks.push({ personId, role, emailAddress: email });
    }

    // Also try to link to org by domain
    const domain = extractDomain(email);
    if (domain && !isCommonEmailProvider(domain) && !linkedOrgIds.has(domain)) {
      const orgId = await findOrgByDomain(domain);
      if (orgId) {
        orgLinks.push({ organizationId: orgId });
        linkedOrgIds.add(domain);
      }
    }
  };

  // Link "from" sender
  await addPersonLink(parsedEmail.fromEmail, 'from');

  // Link "to" recipients
  for (const email of parsedEmail.toEmails) {
    await addPersonLink(email, 'to');
  }

  // Link "cc" recipients
  for (const email of parsedEmail.ccEmails) {
    await addPersonLink(email, 'cc');
  }

  return { personLinks, orgLinks };
}

/**
 * Create email links in database
 */
export async function createEmailLinks(
  emailMessageId: string,
  entities: LinkedEntities
): Promise<void> {
  // Create person links
  if (entities.personLinks.length > 0) {
    await prisma.emailPersonLink.createMany({
      data: entities.personLinks.map((link) => ({
        emailId: emailMessageId,
        personId: link.personId,
        role: link.role,
        emailAddress: link.emailAddress,
      })),
      skipDuplicates: true,
    });
  }

  // Create org links
  if (entities.orgLinks.length > 0) {
    await prisma.emailOrgLink.createMany({
      data: entities.orgLinks.map((link) => ({
        emailId: emailMessageId,
        organizationId: link.organizationId,
      })),
      skipDuplicates: true,
    });
  }
}

/**
 * Get all unique email addresses from an email
 */
export function getAllEmailAddresses(parsedEmail: ParsedEmail): string[] {
  const emails = new Set<string>();
  emails.add(parsedEmail.fromEmail.toLowerCase());
  parsedEmail.toEmails.forEach((e) => emails.add(e.toLowerCase()));
  parsedEmail.ccEmails.forEach((e) => emails.add(e.toLowerCase()));
  return Array.from(emails);
}

/**
 * Get all unique domains from an email (excluding common providers)
 */
export function getAllDomains(parsedEmail: ParsedEmail): string[] {
  const domains = new Set<string>();
  const emails = getAllEmailAddresses(parsedEmail);

  for (const email of emails) {
    const domain = extractDomain(email);
    if (domain && !isCommonEmailProvider(domain)) {
      domains.add(domain);
    }
  }

  return Array.from(domains);
}
