/**
 * Fireflies Sync Service
 * Orchestrates syncing transcripts to Conversations
 */

import { prisma } from '@/lib/db';
import { FirefliesClient, type FirefliesTranscript } from './client';
import {
  linkMeetingParticipants,
  findActiveDealsForOrgs,
} from './entity-linker';

export interface SyncOptions {
  maxTranscripts?: number;
  fromDate?: Date;
  linkDeals?: boolean;
  createMissingPeople?: boolean;
}

export interface SyncResult {
  success: boolean;
  transcriptsFound: number;
  transcriptsCreated: number;
  transcriptsSkipped: number;
  entitiesLinked: {
    participants: number;
    organizations: number;
    deals: number;
  };
  unmatchedEmails: string[];
  errors: string[];
  syncCursor?: Date;
}

/**
 * Sync transcripts from Fireflies to Conversations
 */
export async function syncFirefliesTranscripts(
  connectionId: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    transcriptsFound: 0,
    transcriptsCreated: 0,
    transcriptsSkipped: 0,
    entitiesLinked: { participants: 0, organizations: 0, deals: 0 },
    unmatchedEmails: [],
    errors: [],
  };

  try {
    // Get connection
    const connection = await prisma.firefliesConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      result.errors.push('Fireflies connection not found');
      return result;
    }

    const client = new FirefliesClient({ apiKey: connection.apiKey });
    const maxTranscripts = options.maxTranscripts || 100;
    const fromDate = options.fromDate || connection.syncCursor || undefined;

    // Get existing transcript IDs to skip duplicates
    const existingIds = await prisma.conversation.findMany({
      where: { sourceType: 'fireflies' },
      select: { sourceId: true },
    });
    const existingIdSet = new Set(
      existingIds.map((c) => c.sourceId).filter(Boolean)
    );

    // Fetch transcripts
    const transcripts = await client.listTranscripts({
      limit: maxTranscripts,
      fromDate,
    });

    result.transcriptsFound = transcripts.length;

    // Track latest transcript date for cursor
    let latestDate: Date | null = null;

    // Process each transcript
    for (const transcript of transcripts) {
      try {
        // Skip if already synced
        if (existingIdSet.has(transcript.id)) {
          result.transcriptsSkipped++;
          continue;
        }

        // Link participants to entities
        const entities = await linkMeetingParticipants(
          transcript,
          connection.email
        );
        result.unmatchedEmails.push(...entities.unmatchedEmails);

        // Optionally link to active deals
        let dealIds: string[] = [];
        if (options.linkDeals !== false && entities.organizationIds.length > 0) {
          dealIds = await findActiveDealsForOrgs(entities.organizationIds);
        }

        // Build full transcript text
        const transcriptText = FirefliesClient.buildTranscriptText(transcript);

        // Create Conversation
        const conversationDate = new Date(transcript.date);
        await prisma.conversation.create({
          data: {
            title:
              transcript.title ||
              `Meeting on ${conversationDate.toLocaleDateString()}`,
            summary: transcript.summary?.overview || null,
            transcript: transcriptText || null,
            medium: 'MEETING',
            conversationDate,
            duration: transcript.duration
              ? Math.round(transcript.duration / 60)
              : null,
            sourceType: 'fireflies',
            sourceId: transcript.id,
            sourceUrl: transcript.transcript_url || null,
            privacyTier: 'INTERNAL',
            participants: {
              connect: entities.participantIds.map((id) => ({ id })),
            },
            organizations: {
              connect: entities.organizationIds.map((id) => ({ id })),
            },
            deals: {
              connect: dealIds.map((id) => ({ id })),
            },
          },
        });

        result.transcriptsCreated++;
        result.entitiesLinked.participants += entities.participantIds.length;
        result.entitiesLinked.organizations += entities.organizationIds.length;
        result.entitiesLinked.deals += dealIds.length;

        // Track latest date for cursor
        if (!latestDate || conversationDate > latestDate) {
          latestDate = conversationDate;
        }

        // Add to existing set to prevent duplicates within same sync
        existingIdSet.add(transcript.id);
      } catch (error) {
        result.errors.push(
          `Failed to process transcript ${transcript.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    // Update sync cursor
    if (latestDate) {
      await prisma.firefliesConnection.update({
        where: { id: connectionId },
        data: {
          lastSyncAt: new Date(),
          syncCursor: latestDate,
        },
      });
      result.syncCursor = latestDate;
    } else {
      // Update lastSyncAt even if no new transcripts
      await prisma.firefliesConnection.update({
        where: { id: connectionId },
        data: { lastSyncAt: new Date() },
      });
    }

    // Deduplicate unmatched emails
    result.unmatchedEmails = [...new Set(result.unmatchedEmails)];
    result.success = true;
  } catch (error) {
    result.errors.push(
      `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return result;
}

/**
 * Sync a single transcript (for webhook handler)
 */
export async function syncSingleTranscript(
  connectionId: string,
  transcriptId: string
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  try {
    const connection = await prisma.firefliesConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return { success: false, error: 'Connection not found' };
    }

    // Check if already synced
    const existing = await prisma.conversation.findFirst({
      where: { sourceType: 'fireflies', sourceId: transcriptId },
    });

    if (existing) {
      return { success: true, conversationId: existing.id };
    }

    const client = new FirefliesClient({ apiKey: connection.apiKey });
    const transcript = await client.getTranscript(transcriptId);

    if (!transcript) {
      return { success: false, error: 'Transcript not found' };
    }

    // Link entities
    const entities = await linkMeetingParticipants(transcript, connection.email);
    const dealIds = await findActiveDealsForOrgs(entities.organizationIds);
    const transcriptText = FirefliesClient.buildTranscriptText(transcript);

    // Create conversation
    const conversationDate = new Date(transcript.date);
    const conversation = await prisma.conversation.create({
      data: {
        title:
          transcript.title ||
          `Meeting on ${conversationDate.toLocaleDateString()}`,
        summary: transcript.summary?.overview || null,
        transcript: transcriptText || null,
        medium: 'MEETING',
        conversationDate,
        duration: transcript.duration
          ? Math.round(transcript.duration / 60)
          : null,
        sourceType: 'fireflies',
        sourceId: transcript.id,
        sourceUrl: transcript.transcript_url || null,
        privacyTier: 'INTERNAL',
        participants: {
          connect: entities.participantIds.map((id) => ({ id })),
        },
        organizations: {
          connect: entities.organizationIds.map((id) => ({ id })),
        },
        deals: {
          connect: dealIds.map((id) => ({ id })),
        },
      },
    });

    return { success: true, conversationId: conversation.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get sync statistics for a connection
 */
export async function getFirefliesSyncStats(connectionId: string): Promise<{
  totalMeetings: number;
  linkedParticipants: number;
  linkedOrganizations: number;
  lastSyncAt: Date | null;
  oldestMeeting: Date | null;
  newestMeeting: Date | null;
}> {
  const connection = await prisma.firefliesConnection.findUnique({
    where: { id: connectionId },
    select: { lastSyncAt: true },
  });

  const [meetingCount, dateRange] = await Promise.all([
    prisma.conversation.count({
      where: { sourceType: 'fireflies' },
    }),
    prisma.conversation.aggregate({
      where: { sourceType: 'fireflies' },
      _min: { conversationDate: true },
      _max: { conversationDate: true },
    }),
  ]);

  // Count linked participants and orgs across all fireflies conversations
  const linkedStats = await prisma.conversation.findMany({
    where: { sourceType: 'fireflies' },
    select: {
      _count: {
        select: {
          participants: true,
          organizations: true,
        },
      },
    },
  });

  const totalParticipants = linkedStats.reduce(
    (sum, c) => sum + c._count.participants,
    0
  );
  const totalOrgs = linkedStats.reduce(
    (sum, c) => sum + c._count.organizations,
    0
  );

  return {
    totalMeetings: meetingCount,
    linkedParticipants: totalParticipants,
    linkedOrganizations: totalOrgs,
    lastSyncAt: connection?.lastSyncAt || null,
    oldestMeeting: dateRange._min.conversationDate,
    newestMeeting: dateRange._max.conversationDate,
  };
}

/**
 * Get sync preview - what would be synced
 */
export async function getSyncPreview(connectionId: string): Promise<{
  estimatedNewTranscripts: number;
  lastSyncAt: Date | null;
  syncType: 'full' | 'incremental';
}> {
  const connection = await prisma.firefliesConnection.findUnique({
    where: { id: connectionId },
    select: { lastSyncAt: true, syncCursor: true },
  });

  if (!connection) {
    throw new Error('Connection not found');
  }

  return {
    estimatedNewTranscripts: connection.lastSyncAt ? -1 : -1, // Can't estimate without calling API
    lastSyncAt: connection.lastSyncAt,
    syncType: connection.syncCursor ? 'incremental' : 'full',
  };
}
