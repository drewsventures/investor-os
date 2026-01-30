/**
 * Sync Fireflies Meetings for Existing Contacts Only
 *
 * This script syncs meetings from Fireflies but only imports
 * meetings where at least one participant matches an existing
 * Person in the database.
 */

import { prisma } from '../lib/db';
import { FirefliesClient, type FirefliesTranscript } from '../lib/fireflies/client';
import {
  linkMeetingParticipants,
  findActiveDealsForOrgs,
} from '../lib/fireflies/entity-linker';

interface SyncResult {
  totalTranscriptsFound: number;
  matchingTranscripts: number;
  skippedNoMatch: number;
  alreadySynced: number;
  created: number;
  errors: string[];
  matchedEmails: string[];
}

async function syncFirefliesForExistingContacts(): Promise<SyncResult> {
  const result: SyncResult = {
    totalTranscriptsFound: 0,
    matchingTranscripts: 0,
    skippedNoMatch: 0,
    alreadySynced: 0,
    created: 0,
    errors: [],
    matchedEmails: [],
  };

  try {
    // 1. Get all existing person emails
    console.log('📧 Fetching existing contacts from database...');
    const people = await prisma.person.findMany({
      where: { email: { not: null } },
      select: { email: true },
    });

    const existingEmails = new Set(
      people.map(p => p.email!.toLowerCase())
    );
    console.log(`   Found ${existingEmails.size} contacts with emails`);

    // 2. Get Fireflies connection
    const connection = await prisma.firefliesConnection.findFirst();
    if (!connection) {
      result.errors.push('No Fireflies connection found');
      return result;
    }
    console.log(`✅ Fireflies connected as ${connection.email}`);

    // Add user's email to exclusion set
    const userEmail = connection.email.toLowerCase();

    // 3. Get existing synced transcript IDs
    const existingConversations = await prisma.conversation.findMany({
      where: { sourceType: 'fireflies' },
      select: { sourceId: true },
    });
    const existingSourceIds = new Set(
      existingConversations.map(c => c.sourceId).filter(Boolean)
    );
    console.log(`📝 Already synced ${existingSourceIds.size} meetings`);

    // 4. Fetch transcripts from Fireflies (get more to find matches)
    console.log('\n🔍 Fetching transcripts from Fireflies...');
    const client = new FirefliesClient({ apiKey: connection.apiKey });
    const transcripts = await client.listTranscripts({ limit: 200 });
    result.totalTranscriptsFound = transcripts.length;
    console.log(`   Found ${transcripts.length} total transcripts`);

    // 5. Filter to transcripts with matching participants
    console.log('\n🎯 Filtering to transcripts with existing contacts...');

    for (const transcript of transcripts) {
      // Skip if already synced
      if (existingSourceIds.has(transcript.id)) {
        result.alreadySynced++;
        continue;
      }

      // Get participant emails
      const participantEmails = FirefliesClient.getParticipantEmails(transcript)
        .map(e => e.toLowerCase())
        .filter(e => e !== userEmail);

      // Check if any participant matches existing contacts
      const matchingEmails = participantEmails.filter(e => existingEmails.has(e));

      if (matchingEmails.length === 0) {
        result.skippedNoMatch++;
        continue;
      }

      result.matchingTranscripts++;
      result.matchedEmails.push(...matchingEmails);

      // Sync this transcript
      try {
        const entities = await linkMeetingParticipants(transcript, userEmail);
        const dealIds = entities.organizationIds.length > 0
          ? await findActiveDealsForOrgs(entities.organizationIds)
          : [];

        const transcriptText = FirefliesClient.buildTranscriptText(transcript);
        const conversationDate = new Date(transcript.date);

        await prisma.conversation.create({
          data: {
            title: transcript.title || `Meeting on ${conversationDate.toLocaleDateString()}`,
            summary: transcript.summary?.overview || null,
            transcript: transcriptText || null,
            medium: 'MEETING',
            conversationDate,
            duration: transcript.duration ? Math.round(transcript.duration / 60) : null,
            sourceType: 'fireflies',
            sourceId: transcript.id,
            sourceUrl: transcript.transcript_url || null,
            privacyTier: 'INTERNAL',
            participants: {
              connect: entities.participantIds.map(id => ({ id })),
            },
            organizations: {
              connect: entities.organizationIds.map(id => ({ id })),
            },
            deals: {
              connect: dealIds.map(id => ({ id })),
            },
          },
        });

        result.created++;
        console.log(`   ✓ Synced: ${transcript.title} (matched: ${matchingEmails.join(', ')})`);
      } catch (error) {
        result.errors.push(`Failed to sync ${transcript.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    // Update sync timestamp
    await prisma.firefliesConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });

    // Deduplicate matched emails
    result.matchedEmails = [...new Set(result.matchedEmails)];

  } catch (error) {
    result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return result;
}

// Run the sync
async function main() {
  console.log('🚀 Starting Fireflies sync for existing contacts only...\n');

  const result = await syncFirefliesForExistingContacts();

  console.log('\n' + '='.repeat(50));
  console.log('📊 SYNC RESULTS');
  console.log('='.repeat(50));
  console.log(`Total transcripts found:    ${result.totalTranscriptsFound}`);
  console.log(`Already synced:             ${result.alreadySynced}`);
  console.log(`Skipped (no match):         ${result.skippedNoMatch}`);
  console.log(`Matching transcripts:       ${result.matchingTranscripts}`);
  console.log(`Successfully created:       ${result.created}`);

  if (result.matchedEmails.length > 0) {
    console.log(`\n📧 Matched contact emails:`);
    result.matchedEmails.forEach(e => console.log(`   - ${e}`));
  }

  if (result.errors.length > 0) {
    console.log(`\n❌ Errors (${result.errors.length}):`);
    result.errors.forEach(e => console.log(`   - ${e}`));
  }

  await prisma.$disconnect();
}

main().catch(console.error);
