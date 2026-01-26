/**
 * Unified Activity Feed Types
 * Defines the common interface for all activity types
 */

export type ActivityType =
  | 'email'           // From EmailMessage (Gmail)
  | 'meeting'         // From Conversation (Fireflies, manual)
  | 'note'            // From Update (manual note)
  | 'news'            // From Update (external news)
  | 'investor_update' // From Update (forwarded investor update)
  | 'twitter'         // From Update (Twitter/X post)
  | 'linkedin'        // From Update (LinkedIn post)
  | 'press_release'   // From Update (PR announcement)
  | 'deal_update'     // Deal stage changes
  | 'other';          // From Update (other)

/**
 * Unified Activity interface
 * All activities are normalized to this format for the feed
 */
export interface Activity {
  id: string;
  type: ActivityType;
  date: Date;
  title: string;
  summary?: string | null;
  content?: string | null;

  // Metadata varies by type
  metadata: ActivityMetadata;

  // Links to entities
  personIds: string[];
  organizationIds: string[];
  dealIds: string[];

  // Source reference
  sourceType: string;
  sourceId: string;
  sourceUrl?: string | null;

  // Author (for manual entries)
  author?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  } | null;
}

export interface ActivityMetadata {
  // Email metadata
  from?: string;
  to?: string[];
  cc?: string[];
  snippet?: string;
  hasAttachments?: boolean;
  threadId?: string;

  // Meeting metadata
  duration?: number;
  participants?: Array<{ name: string; email?: string }>;
  hasTranscript?: boolean;
  medium?: string;

  // News/Social metadata
  sourceName?: string;
  sourceAuthor?: string;
  imageUrl?: string;

  // Deal metadata
  stage?: string;
  previousStage?: string;
  amount?: number;

  // Custom metadata
  [key: string]: unknown;
}

/**
 * Activity feed options
 */
export interface ActivityFeedOptions {
  personId?: string;
  organizationId?: string;
  dealId?: string;
  types?: ActivityType[];
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Activity feed result
 */
export interface ActivityFeedResult {
  activities: Activity[];
  total: number;
  hasMore: boolean;
}

/**
 * Map UpdateType enum to ActivityType
 */
export function updateTypeToActivityType(
  updateType: 'NOTE' | 'NEWS' | 'INVESTOR_UPDATE' | 'TWITTER' | 'LINKEDIN' | 'PRESS_RELEASE' | 'OTHER'
): ActivityType {
  const mapping: Record<string, ActivityType> = {
    NOTE: 'note',
    NEWS: 'news',
    INVESTOR_UPDATE: 'investor_update',
    TWITTER: 'twitter',
    LINKEDIN: 'linkedin',
    PRESS_RELEASE: 'press_release',
    OTHER: 'other',
  };
  return mapping[updateType] || 'other';
}

/**
 * Activity type display info
 */
export const ACTIVITY_TYPE_INFO: Record<ActivityType, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  email: {
    label: 'Email',
    icon: 'Mail',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  meeting: {
    label: 'Meeting',
    icon: 'Video',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  note: {
    label: 'Note',
    icon: 'FileText',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  news: {
    label: 'News',
    icon: 'Newspaper',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  investor_update: {
    label: 'Investor Update',
    icon: 'TrendingUp',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  twitter: {
    label: 'Twitter',
    icon: 'Twitter',
    color: 'text-sky-600',
    bgColor: 'bg-sky-100',
  },
  linkedin: {
    label: 'LinkedIn',
    icon: 'Linkedin',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  press_release: {
    label: 'Press Release',
    icon: 'Megaphone',
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
  },
  deal_update: {
    label: 'Deal Update',
    icon: 'DollarSign',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  other: {
    label: 'Activity',
    icon: 'Activity',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
  },
};
