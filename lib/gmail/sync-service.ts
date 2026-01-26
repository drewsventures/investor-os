/**
 * Gmail Sync Service
 * Orchestrates email synchronization from Gmail to the database
 */

import { prisma } from '@/lib/db';
import { GmailClient, getGmailConfig, type ParsedEmail } from './client';
import { linkEmailToEntities, createEmailLinks } from './entity-linker';

export interface SyncOptions {
  maxMessages?: number;
  batchSize?: number;
  query?: string; // Gmail search query
}

export interface SyncResult {
  success: boolean;
  messagesFound: number;
  messagesCreated: number;
  messagesSkipped: number;
  entitiesLinked: {
    persons: number;
    organizations: number;
  };
  errors: string[];
  syncCursor?: string;
}

/**
 * Get or refresh a valid access token for a Gmail connection
 */
export async function getValidAccessToken(connectionId: string): Promise<{
  accessToken: string;
  email: string;
} | null> {
  const connection = await prisma.gmailConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const now = new Date();
  const expiresAt = new Date(connection.tokenExpiresAt);
  const isExpired = expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

  if (isExpired) {
    try {
      const config = getGmailConfig();
      const refreshed = await GmailClient.refreshAccessToken(
        config,
        connection.refreshToken
      );

      // Update stored tokens
      await prisma.gmailConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: refreshed.accessToken,
          tokenExpiresAt: refreshed.expiresAt,
        },
      });

      return { accessToken: refreshed.accessToken, email: connection.email };
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  return { accessToken: connection.accessToken, email: connection.email };
}

/**
 * Sync emails from Gmail
 */
export async function syncEmails(
  connectionId: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    messagesFound: 0,
    messagesCreated: 0,
    messagesSkipped: 0,
    entitiesLinked: { persons: 0, organizations: 0 },
    errors: [],
  };

  try {
    // Get valid access token
    const tokenResult = await getValidAccessToken(connectionId);
    if (!tokenResult) {
      result.errors.push('Failed to get valid access token');
      return result;
    }

    const config = getGmailConfig();
    const client = new GmailClient(config, tokenResult.accessToken);

    const maxMessages = options.maxMessages || 500;
    const batchSize = options.batchSize || 50;

    // Get existing message IDs to skip duplicates
    const existingIds = await prisma.emailMessage.findMany({
      select: { gmailMessageId: true },
    });
    const existingIdSet = new Set(existingIds.map((m) => m.gmailMessageId));

    // Fetch message list
    let pageToken: string | undefined;
    const messageIds: Array<{ id: string; threadId: string }> = [];

    while (messageIds.length < maxMessages) {
      const listResult = await client.listMessages({
        maxResults: Math.min(batchSize, maxMessages - messageIds.length),
        pageToken,
        q: options.query,
      });

      if (listResult.messages) {
        messageIds.push(...listResult.messages);
      }

      result.messagesFound = messageIds.length;

      if (!listResult.nextPageToken || messageIds.length >= maxMessages) {
        break;
      }
      pageToken = listResult.nextPageToken;
    }

    // Process messages in batches
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);

      for (const { id: messageId, threadId } of batch) {
        try {
          // Skip if already exists
          if (existingIdSet.has(messageId)) {
            result.messagesSkipped++;
            continue;
          }

          // Fetch full message
          const message = await client.getMessage(messageId);
          const parsed = client.parseMessage(message, tokenResult.email);

          // Determine if inbound
          const isInbound =
            parsed.fromEmail.toLowerCase() !== tokenResult.email.toLowerCase();

          // Store message
          const emailMessage = await prisma.emailMessage.create({
            data: {
              gmailMessageId: parsed.id,
              gmailThreadId: parsed.threadId,
              subject: parsed.subject,
              snippet: parsed.snippet,
              bodyText: parsed.bodyText,
              fromEmail: parsed.fromEmail,
              fromName: parsed.fromName,
              toEmails: parsed.toEmails,
              ccEmails: parsed.ccEmails,
              sentAt: parsed.sentAt,
              isInbound,
              hasAttachments: parsed.hasAttachments,
              labels: parsed.labels,
            },
          });

          result.messagesCreated++;

          // Link to entities
          const entities = await linkEmailToEntities(parsed, tokenResult.email);
          await createEmailLinks(emailMessage.id, entities);

          result.entitiesLinked.persons += entities.personLinks.length;
          result.entitiesLinked.organizations += entities.orgLinks.length;

          // Add to existing set
          existingIdSet.add(messageId);
        } catch (error) {
          result.errors.push(
            `Failed to process message ${messageId}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    // Update connection with sync info
    const profile = await client.getProfile();
    await prisma.gmailConnection.update({
      where: { id: connectionId },
      data: {
        lastSyncAt: new Date(),
        syncCursor: profile.historyId,
      },
    });

    result.syncCursor = profile.historyId;
    result.success = true;
  } catch (error) {
    result.errors.push(
      `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return result;
}

/**
 * Incremental sync using Gmail History API
 */
export async function syncIncremental(connectionId: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    messagesFound: 0,
    messagesCreated: 0,
    messagesSkipped: 0,
    entitiesLinked: { persons: 0, organizations: 0 },
    errors: [],
  };

  try {
    const connection = await prisma.gmailConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection?.syncCursor) {
      // No previous sync cursor, do full sync instead
      return syncEmails(connectionId);
    }

    const tokenResult = await getValidAccessToken(connectionId);
    if (!tokenResult) {
      result.errors.push('Failed to get valid access token');
      return result;
    }

    const config = getGmailConfig();
    const client = new GmailClient(config, tokenResult.accessToken);

    // Get history since last sync
    let pageToken: string | undefined;
    const newMessageIds: Array<{ id: string; threadId: string }> = [];

    try {
      while (true) {
        const historyResult = await client.getHistory(
          connection.syncCursor,
          pageToken
        );

        if (historyResult.history) {
          for (const entry of historyResult.history) {
            if (entry.messagesAdded) {
              for (const { message } of entry.messagesAdded) {
                newMessageIds.push(message);
              }
            }
          }
        }

        if (!historyResult.nextPageToken) {
          result.syncCursor = historyResult.historyId;
          break;
        }
        pageToken = historyResult.nextPageToken;
      }
    } catch (error) {
      // History may be unavailable if cursor is too old
      console.warn('History API failed, falling back to full sync');
      return syncEmails(connectionId, { maxMessages: 100 });
    }

    result.messagesFound = newMessageIds.length;

    // Process new messages
    const existingIds = await prisma.emailMessage.findMany({
      where: {
        gmailMessageId: { in: newMessageIds.map((m) => m.id) },
      },
      select: { gmailMessageId: true },
    });
    const existingIdSet = new Set(existingIds.map((m) => m.gmailMessageId));

    for (const { id: messageId } of newMessageIds) {
      if (existingIdSet.has(messageId)) {
        result.messagesSkipped++;
        continue;
      }

      try {
        const message = await client.getMessage(messageId);
        const parsed = client.parseMessage(message, tokenResult.email);

        const isInbound =
          parsed.fromEmail.toLowerCase() !== tokenResult.email.toLowerCase();

        const emailMessage = await prisma.emailMessage.create({
          data: {
            gmailMessageId: parsed.id,
            gmailThreadId: parsed.threadId,
            subject: parsed.subject,
            snippet: parsed.snippet,
            bodyText: parsed.bodyText,
            fromEmail: parsed.fromEmail,
            fromName: parsed.fromName,
            toEmails: parsed.toEmails,
            ccEmails: parsed.ccEmails,
            sentAt: parsed.sentAt,
            isInbound,
            hasAttachments: parsed.hasAttachments,
            labels: parsed.labels,
          },
        });

        result.messagesCreated++;

        const entities = await linkEmailToEntities(parsed, tokenResult.email);
        await createEmailLinks(emailMessage.id, entities);

        result.entitiesLinked.persons += entities.personLinks.length;
        result.entitiesLinked.organizations += entities.orgLinks.length;
      } catch (error) {
        result.errors.push(
          `Failed to process message ${messageId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Update sync cursor
    if (result.syncCursor) {
      await prisma.gmailConnection.update({
        where: { id: connectionId },
        data: {
          lastSyncAt: new Date(),
          syncCursor: result.syncCursor,
        },
      });
    }

    result.success = true;
  } catch (error) {
    result.errors.push(
      `Incremental sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return result;
}

/**
 * Get sync statistics for a connection
 */
export async function getSyncStats(connectionId: string): Promise<{
  totalEmails: number;
  linkedPersons: number;
  linkedOrgs: number;
  lastSyncAt: Date | null;
  oldestEmail: Date | null;
  newestEmail: Date | null;
}> {
  const connection = await prisma.gmailConnection.findUnique({
    where: { id: connectionId },
    select: { lastSyncAt: true },
  });

  const [emailCount, personLinkCount, orgLinkCount, dateRange] = await Promise.all([
    prisma.emailMessage.count(),
    prisma.emailPersonLink.count(),
    prisma.emailOrgLink.count(),
    prisma.emailMessage.aggregate({
      _min: { sentAt: true },
      _max: { sentAt: true },
    }),
  ]);

  return {
    totalEmails: emailCount,
    linkedPersons: personLinkCount,
    linkedOrgs: orgLinkCount,
    lastSyncAt: connection?.lastSyncAt || null,
    oldestEmail: dateRange._min.sentAt,
    newestEmail: dateRange._max.sentAt,
  };
}
