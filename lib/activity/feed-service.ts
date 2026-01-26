/**
 * Activity Feed Service
 * Aggregates activities from multiple sources into a unified feed
 */

import { prisma } from '@/lib/db';
import { ConversationMedium, UpdateType as PrismaUpdateType } from '@prisma/client';
import {
  type Activity,
  type ActivityFeedOptions,
  type ActivityFeedResult,
  type ActivityType,
  updateTypeToActivityType,
} from './types';

/**
 * Get unified activity feed for an entity
 */
export async function getActivityFeed(
  options: ActivityFeedOptions
): Promise<ActivityFeedResult> {
  const { personId, organizationId, dealId, types, fromDate, toDate, limit = 50, offset = 0 } = options;

  // Determine which activity types to fetch
  const includeEmails = !types || types.includes('email');
  const includeMeetings = !types || types.includes('meeting');
  const includeUpdates = !types || types.some((t) =>
    ['note', 'news', 'investor_update', 'twitter', 'linkedin', 'press_release', 'other'].includes(t)
  );

  // Fetch activities from each source in parallel
  const [emails, meetings, updates] = await Promise.all([
    includeEmails ? fetchEmailActivities({ personId, organizationId, fromDate, toDate }) : [],
    includeMeetings ? fetchMeetingActivities({ personId, organizationId, dealId, fromDate, toDate }) : [],
    includeUpdates ? fetchUpdateActivities({ personId, organizationId, dealId, types, fromDate, toDate }) : [],
  ]);

  // Merge all activities
  let allActivities = [...emails, ...meetings, ...updates];

  // Filter by types if specified
  if (types && types.length > 0) {
    allActivities = allActivities.filter((a) => types.includes(a.type));
  }

  // Sort by date descending
  allActivities.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Get total before pagination
  const total = allActivities.length;

  // Apply pagination
  const paginated = allActivities.slice(offset, offset + limit);

  return {
    activities: paginated,
    total,
    hasMore: offset + paginated.length < total,
  };
}

/**
 * Fetch email activities
 */
async function fetchEmailActivities(options: {
  personId?: string;
  organizationId?: string;
  fromDate?: Date;
  toDate?: Date;
}): Promise<Activity[]> {
  const { personId, organizationId, fromDate, toDate } = options;

  // Build where clause for email links
  const where: {
    personLinks?: { some: { personId: string } };
    orgLinks?: { some: { organizationId: string } };
    sentAt?: { gte?: Date; lte?: Date };
  } = {};

  if (personId) {
    where.personLinks = { some: { personId } };
  }
  if (organizationId) {
    where.orgLinks = { some: { organizationId } };
  }
  if (fromDate || toDate) {
    where.sentAt = {};
    if (fromDate) where.sentAt.gte = fromDate;
    if (toDate) where.sentAt.lte = toDate;
  }

  // Only fetch if we have a filter
  if (!personId && !organizationId) {
    return [];
  }

  const emails = await prisma.emailMessage.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    take: 100, // Limit per source
    include: {
      personLinks: {
        select: { personId: true },
      },
      orgLinks: {
        select: { organizationId: true },
      },
    },
  });

  return emails.map((email): Activity => ({
    id: `email-${email.id}`,
    type: 'email',
    date: email.sentAt || email.createdAt,
    title: email.subject || '(No subject)',
    summary: email.snippet,
    content: email.bodyText,
    metadata: {
      from: email.fromEmail || undefined,
      to: email.toEmails,
      cc: email.ccEmails,
      snippet: email.snippet || undefined,
      hasAttachments: email.hasAttachments,
      threadId: email.gmailThreadId || undefined,
    },
    personIds: email.personLinks.map((p) => p.personId),
    organizationIds: email.orgLinks.map((o) => o.organizationId),
    dealIds: [],
    sourceType: 'gmail',
    sourceId: email.gmailMessageId,
    sourceUrl: null,
    author: null,
  }));
}

/**
 * Fetch meeting activities (from Conversations)
 */
async function fetchMeetingActivities(options: {
  personId?: string;
  organizationId?: string;
  dealId?: string;
  fromDate?: Date;
  toDate?: Date;
}): Promise<Activity[]> {
  const { personId, organizationId, dealId, fromDate, toDate } = options;

  // Build where clause
  const where: {
    medium?: ConversationMedium;
    participants?: { some: { id: string } };
    organizations?: { some: { id: string } };
    deals?: { some: { id: string } };
    conversationDate?: { gte?: Date; lte?: Date };
  } = {
    medium: ConversationMedium.MEETING,
  };

  if (personId) {
    where.participants = { some: { id: personId } };
  }
  if (organizationId) {
    where.organizations = { some: { id: organizationId } };
  }
  if (dealId) {
    where.deals = { some: { id: dealId } };
  }
  if (fromDate || toDate) {
    where.conversationDate = {};
    if (fromDate) where.conversationDate.gte = fromDate;
    if (toDate) where.conversationDate.lte = toDate;
  }

  // Only fetch if we have a filter
  if (!personId && !organizationId && !dealId) {
    return [];
  }

  const meetings = await prisma.conversation.findMany({
    where,
    orderBy: { conversationDate: 'desc' },
    take: 100,
    include: {
      participants: {
        select: { id: true, fullName: true, email: true },
      },
      organizations: {
        select: { id: true },
      },
      deals: {
        select: { id: true },
      },
    },
  });

  return meetings.map((meeting): Activity => ({
    id: `meeting-${meeting.id}`,
    type: 'meeting',
    date: meeting.conversationDate || meeting.createdAt,
    title: meeting.title,
    summary: meeting.summary,
    content: meeting.transcript,
    metadata: {
      duration: meeting.duration || undefined,
      participants: meeting.participants.map((p) => ({
        name: p.fullName,
        email: p.email || undefined,
      })),
      hasTranscript: !!meeting.transcript,
      medium: meeting.medium,
    },
    personIds: meeting.participants.map((p) => p.id),
    organizationIds: meeting.organizations.map((o) => o.id),
    dealIds: meeting.deals.map((d) => d.id),
    sourceType: meeting.sourceType || 'manual',
    sourceId: meeting.sourceId || meeting.id,
    sourceUrl: meeting.sourceUrl,
    author: null,
  }));
}

/**
 * Fetch update activities (notes, news, investor updates, etc.)
 */
async function fetchUpdateActivities(options: {
  personId?: string;
  organizationId?: string;
  dealId?: string;
  types?: ActivityType[];
  fromDate?: Date;
  toDate?: Date;
}): Promise<Activity[]> {
  const { personId, organizationId, dealId, types, fromDate, toDate } = options;

  // Build where clause
  const where: {
    personId?: string;
    organizationId?: string;
    dealId?: string;
    type?: { in: PrismaUpdateType[] };
    updateDate?: { gte?: Date; lte?: Date };
    OR?: Array<{ personId: string } | { organizationId: string } | { dealId: string }>;
  } = {};

  // Build OR clause for entity filters
  const orConditions: Array<{ personId: string } | { organizationId: string } | { dealId: string }> = [];
  if (personId) orConditions.push({ personId });
  if (organizationId) orConditions.push({ organizationId });
  if (dealId) orConditions.push({ dealId });

  if (orConditions.length > 0) {
    where.OR = orConditions;
  } else {
    // No entity filter, don't fetch
    return [];
  }

  // Filter by update types
  if (types && types.length > 0) {
    const updateTypes = types
      .filter((t) => ['note', 'news', 'investor_update', 'twitter', 'linkedin', 'press_release', 'other'].includes(t))
      .map((t) => {
        const mapping: Record<string, PrismaUpdateType> = {
          note: PrismaUpdateType.NOTE,
          news: PrismaUpdateType.NEWS,
          investor_update: PrismaUpdateType.INVESTOR_UPDATE,
          twitter: PrismaUpdateType.TWITTER,
          linkedin: PrismaUpdateType.LINKEDIN,
          press_release: PrismaUpdateType.PRESS_RELEASE,
          other: PrismaUpdateType.OTHER,
        };
        return mapping[t];
      })
      .filter((t): t is PrismaUpdateType => t !== undefined);

    if (updateTypes.length > 0) {
      where.type = { in: updateTypes };
    }
  }

  if (fromDate || toDate) {
    where.updateDate = {};
    if (fromDate) where.updateDate.gte = fromDate;
    if (toDate) where.updateDate.lte = toDate;
  }

  const updates = await prisma.update.findMany({
    where,
    orderBy: { updateDate: 'desc' },
    take: 100,
    include: {
      author: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      person: {
        select: { id: true },
      },
      organization: {
        select: { id: true },
      },
      deal: {
        select: { id: true },
      },
    },
  });

  return updates.map((update): Activity => ({
    id: `update-${update.id}`,
    type: updateTypeToActivityType(update.type),
    date: update.updateDate,
    title: update.title || getDefaultTitle(update.type),
    summary: update.content.substring(0, 200) + (update.content.length > 200 ? '...' : ''),
    content: update.content,
    metadata: {
      sourceName: update.sourceName || undefined,
      sourceAuthor: update.sourceAuthor || undefined,
      imageUrl: (update.metadata as { imageUrl?: string })?.imageUrl,
      ...(update.metadata as object || {}),
    },
    personIds: update.person ? [update.person.id] : [],
    organizationIds: update.organization ? [update.organization.id] : [],
    dealIds: update.deal ? [update.deal.id] : [],
    sourceType: 'update',
    sourceId: update.id,
    sourceUrl: update.sourceUrl,
    author: update.author,
  }));
}

function getDefaultTitle(type: string): string {
  const titles: Record<string, string> = {
    NOTE: 'Note',
    NEWS: 'News Article',
    INVESTOR_UPDATE: 'Investor Update',
    TWITTER: 'Twitter Post',
    LINKEDIN: 'LinkedIn Post',
    PRESS_RELEASE: 'Press Release',
    OTHER: 'Update',
  };
  return titles[type] || 'Update';
}

/**
 * Get activity counts by type for an entity
 */
export async function getActivityCounts(options: {
  personId?: string;
  organizationId?: string;
  dealId?: string;
}): Promise<Record<ActivityType, number>> {
  const { personId, organizationId, dealId } = options;

  const counts: Record<ActivityType, number> = {
    email: 0,
    meeting: 0,
    note: 0,
    news: 0,
    investor_update: 0,
    twitter: 0,
    linkedin: 0,
    press_release: 0,
    deal_update: 0,
    other: 0,
  };

  // Build base where clauses
  const emailWhere: { personLinks?: { some: { personId: string } }; orgLinks?: { some: { organizationId: string } } } = {};
  const meetingWhere: { medium: ConversationMedium; participants?: { some: { id: string } }; organizations?: { some: { id: string } }; deals?: { some: { id: string } } } = { medium: ConversationMedium.MEETING };
  const updateWhere: { OR?: Array<{ personId: string } | { organizationId: string } | { dealId: string }> } = {};

  if (personId) {
    emailWhere.personLinks = { some: { personId } };
    meetingWhere.participants = { some: { id: personId } };
  }
  if (organizationId) {
    emailWhere.orgLinks = { some: { organizationId } };
    meetingWhere.organizations = { some: { id: organizationId } };
  }
  if (dealId) {
    meetingWhere.deals = { some: { id: dealId } };
  }

  // Build OR for updates
  const orConditions: Array<{ personId: string } | { organizationId: string } | { dealId: string }> = [];
  if (personId) orConditions.push({ personId });
  if (organizationId) orConditions.push({ organizationId });
  if (dealId) orConditions.push({ dealId });
  if (orConditions.length > 0) {
    updateWhere.OR = orConditions;
  }

  // Fetch counts in parallel
  const [emailCount, meetingCount, updateCounts] = await Promise.all([
    (personId || organizationId) ? prisma.emailMessage.count({ where: emailWhere }) : 0,
    (personId || organizationId || dealId) ? prisma.conversation.count({ where: meetingWhere }) : 0,
    orConditions.length > 0
      ? prisma.update.groupBy({
          by: ['type'],
          where: updateWhere,
          _count: true,
        })
      : [],
  ]);

  counts.email = emailCount;
  counts.meeting = meetingCount;

  for (const group of updateCounts) {
    const activityType = updateTypeToActivityType(group.type);
    counts[activityType] = group._count;
  }

  return counts;
}
