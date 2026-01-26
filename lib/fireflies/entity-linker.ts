/**
 * Entity Linker for Fireflies
 * Links meeting participants to People and Organizations
 *
 * Reuses helper functions from the Gmail entity linker for consistency.
 */

import { prisma } from '@/lib/db';
import {
  extractDomain,
  isCommonEmailProvider,
  findPersonByEmail,
  findOrgByDomain,
} from '@/lib/gmail/entity-linker';
import type { FirefliesTranscript } from './client';
import { FirefliesClient } from './client';

export interface LinkedMeetingEntities {
  participantIds: string[];
  organizationIds: string[];
  unmatchedEmails: string[];
}

/**
 * Link meeting participants to People and Organizations
 */
export async function linkMeetingParticipants(
  transcript: FirefliesTranscript,
  userEmail: string
): Promise<LinkedMeetingEntities> {
  const participantIds: string[] = [];
  const organizationIds: string[] = [];
  const unmatchedEmails: string[] = [];
  const linkedOrgDomains = new Set<string>();

  // Get all participant emails from transcript
  const participantEmails = FirefliesClient.getParticipantEmails(transcript);

  // Process each participant
  for (const email of participantEmails) {
    // Skip the user's own email
    if (email.toLowerCase() === userEmail.toLowerCase()) {
      continue;
    }

    // Try to find matching Person
    const personId = await findPersonByEmail(email);
    if (personId) {
      if (!participantIds.includes(personId)) {
        participantIds.push(personId);
      }
    } else {
      unmatchedEmails.push(email);
    }

    // Try to link Organization by domain
    const domain = extractDomain(email);
    if (domain && !isCommonEmailProvider(domain) && !linkedOrgDomains.has(domain)) {
      const orgId = await findOrgByDomain(domain);
      if (orgId && !organizationIds.includes(orgId)) {
        organizationIds.push(orgId);
        linkedOrgDomains.add(domain);
      }
    }
  }

  return {
    participantIds,
    organizationIds,
    unmatchedEmails: [...new Set(unmatchedEmails)], // Deduplicate
  };
}

/**
 * Find active deals for linked organizations
 * Used to auto-link meetings to relevant deals
 */
export async function findActiveDealsForOrgs(
  organizationIds: string[]
): Promise<string[]> {
  if (organizationIds.length === 0) return [];

  const deals = await prisma.deal.findMany({
    where: {
      organizationId: { in: organizationIds },
      stage: {
        notIn: ['PASSED', 'PORTFOLIO'],
      },
    },
    select: { id: true },
  });

  return deals.map((d) => d.id);
}

/**
 * Get participant info with names for display or creating Person records
 */
export function getParticipantInfo(
  transcript: FirefliesTranscript
): Array<{ email: string; name: string | null }> {
  const participants: Array<{ email: string; name: string | null }> = [];
  const seenEmails = new Set<string>();

  // Prefer meeting_attendees (has both email and name)
  for (const attendee of transcript.meeting_attendees || []) {
    if (attendee.email && !seenEmails.has(attendee.email.toLowerCase())) {
      participants.push({
        email: attendee.email.toLowerCase(),
        name: attendee.name || null,
      });
      seenEmails.add(attendee.email.toLowerCase());
    }
  }

  // Add any from participants array that weren't in meeting_attendees
  for (const email of transcript.participants || []) {
    if (email && email.includes('@') && !seenEmails.has(email.toLowerCase())) {
      participants.push({
        email: email.toLowerCase(),
        name: null,
      });
      seenEmails.add(email.toLowerCase());
    }
  }

  return participants;
}

/**
 * Create or find Person records for unmatched emails
 * Returns a map of email -> personId
 */
export async function createMissingPeople(
  unmatchedEmails: string[],
  transcript: FirefliesTranscript
): Promise<Map<string, string>> {
  const emailToPersonId = new Map<string, string>();
  const participantInfo = getParticipantInfo(transcript);

  for (const email of unmatchedEmails) {
    // Get name from participant info if available
    const info = participantInfo.find((p) => p.email === email.toLowerCase());
    const nameParts = info?.name?.split(' ') || [email.split('@')[0]];
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || '';
    const fullName = info?.name || email.split('@')[0];

    // Create canonical key from email
    const canonicalKey = `email:${email.toLowerCase()}`;

    // Check if person exists by email (just in case)
    const existing = await prisma.person.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: 'insensitive' } },
          { canonicalKey },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      emailToPersonId.set(email.toLowerCase(), existing.id);
    } else {
      // Create new person
      const newPerson = await prisma.person.create({
        data: {
          canonicalKey,
          firstName,
          lastName,
          fullName,
          email: email.toLowerCase(),
          privacyTier: 'INTERNAL',
        },
        select: { id: true },
      });
      emailToPersonId.set(email.toLowerCase(), newPerson.id);
    }
  }

  return emailToPersonId;
}
