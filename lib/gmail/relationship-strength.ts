/**
 * Relationship Strength Calculator
 * Calculates and caches relationship strength scores based on email interactions
 */

import { prisma } from '@/lib/db';
import { generateRelationshipSummary } from './ai-analysis';
import { Decimal } from '@prisma/client/runtime/library';

export interface StrengthFactors {
  recency: number; // 0-1: How recent was the last contact
  frequency: number; // 0-1: How often do we communicate
  engagement: number; // 0-1: Thread depth, response rates
  reciprocity: number; // 0-1: Is it two-way communication
}

export interface RelationshipStrengthResult {
  strength: number;
  trend: 'strengthening' | 'stable' | 'weakening';
  factors: StrengthFactors;
  totalEmails: number;
  lastEmailAt: Date | null;
}

/**
 * Calculate recency score
 * 1.0 for contact today, decays over 90 days
 */
function calculateRecency(lastEmailDate: Date | null): number {
  if (!lastEmailDate) return 0;

  const now = new Date();
  const daysSince = Math.floor(
    (now.getTime() - lastEmailDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSince <= 7) return 1.0;
  if (daysSince <= 14) return 0.9;
  if (daysSince <= 30) return 0.8;
  if (daysSince <= 60) return 0.6;
  if (daysSince <= 90) return 0.4;
  if (daysSince <= 180) return 0.2;
  return 0.1;
}

/**
 * Calculate frequency score
 * Based on emails per month in last 90 days
 */
function calculateFrequency(emailsInLast90Days: number): number {
  const emailsPerMonth = emailsInLast90Days / 3;

  if (emailsPerMonth >= 20) return 1.0;
  if (emailsPerMonth >= 10) return 0.9;
  if (emailsPerMonth >= 5) return 0.8;
  if (emailsPerMonth >= 3) return 0.6;
  if (emailsPerMonth >= 1) return 0.4;
  if (emailsPerMonth >= 0.5) return 0.2;
  return 0.1;
}

/**
 * Calculate engagement score
 * Based on average thread depth
 */
function calculateEngagement(avgThreadDepth: number): number {
  if (avgThreadDepth >= 10) return 1.0;
  if (avgThreadDepth >= 6) return 0.8;
  if (avgThreadDepth >= 4) return 0.6;
  if (avgThreadDepth >= 2) return 0.4;
  return 0.2;
}

/**
 * Calculate reciprocity score
 * Based on ratio of sent vs received
 */
function calculateReciprocity(sent: number, received: number): number {
  if (sent === 0 && received === 0) return 0;

  const total = sent + received;
  const ratio = Math.min(sent, received) / Math.max(sent, received);

  // Perfect reciprocity is 1:1
  if (ratio >= 0.8) return 1.0;
  if (ratio >= 0.6) return 0.8;
  if (ratio >= 0.4) return 0.6;
  if (ratio >= 0.2) return 0.4;

  // One-sided communication
  return 0.2;
}

/**
 * Calculate combined strength score
 */
function calculateCombinedStrength(factors: StrengthFactors): number {
  // Weighted average
  const weights = {
    recency: 0.35,
    frequency: 0.25,
    engagement: 0.20,
    reciprocity: 0.20,
  };

  return (
    factors.recency * weights.recency +
    factors.frequency * weights.frequency +
    factors.engagement * weights.engagement +
    factors.reciprocity * weights.reciprocity
  );
}

/**
 * Determine trend based on current vs previous strength
 */
function determineTrend(
  currentStrength: number,
  previousStrength: number | null
): 'strengthening' | 'stable' | 'weakening' {
  if (previousStrength === null) return 'stable';

  const diff = currentStrength - previousStrength;
  if (diff > 0.1) return 'strengthening';
  if (diff < -0.1) return 'weakening';
  return 'stable';
}

/**
 * Calculate relationship strength for a person
 */
export async function calculateRelationshipStrength(
  personId: string
): Promise<RelationshipStrengthResult | null> {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Get email stats for this person
  const [
    totalEmails,
    recentEmails,
    lastEmail,
    sentCount,
    receivedCount,
    threadStats,
  ] = await Promise.all([
    // Total emails
    prisma.emailPersonLink.count({
      where: { personId },
    }),
    // Emails in last 90 days
    prisma.emailPersonLink.count({
      where: {
        personId,
        email: { sentAt: { gte: ninetyDaysAgo } },
      },
    }),
    // Last email
    prisma.emailMessage.findFirst({
      where: {
        personLinks: { some: { personId } },
      },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    }),
    // Sent emails (outbound where person is recipient)
    prisma.emailMessage.count({
      where: {
        isInbound: false,
        personLinks: { some: { personId, role: { in: ['to', 'cc'] } } },
      },
    }),
    // Received emails (inbound from person)
    prisma.emailMessage.count({
      where: {
        isInbound: true,
        personLinks: { some: { personId, role: 'from' } },
      },
    }),
    // Thread depth stats
    prisma.emailPersonLink.findMany({
      where: { personId },
      select: { email: { select: { gmailThreadId: true } } },
    }),
  ]);

  if (totalEmails === 0) {
    return {
      strength: 0,
      trend: 'stable',
      factors: { recency: 0, frequency: 0, engagement: 0, reciprocity: 0 },
      totalEmails: 0,
      lastEmailAt: null,
    };
  }

  // Calculate average thread depth
  const threadIds = new Set(threadStats.map((t) => t.email.gmailThreadId));
  let totalThreadEmails = 0;
  for (const threadId of threadIds) {
    const count = await prisma.emailMessage.count({
      where: { gmailThreadId: threadId },
    });
    totalThreadEmails += count;
  }
  const avgThreadDepth = threadIds.size > 0 ? totalThreadEmails / threadIds.size : 0;

  // Calculate factors
  const factors: StrengthFactors = {
    recency: calculateRecency(lastEmail?.sentAt || null),
    frequency: calculateFrequency(recentEmails),
    engagement: calculateEngagement(avgThreadDepth),
    reciprocity: calculateReciprocity(sentCount, receivedCount),
  };

  const strength = calculateCombinedStrength(factors);

  // Get previous strength for trend
  const previousRecord = await prisma.relationshipStrength.findUnique({
    where: { personId },
    select: { strength: true },
  });

  const trend = determineTrend(
    strength,
    previousRecord ? Number(previousRecord.strength) : null
  );

  return {
    strength,
    trend,
    factors,
    totalEmails,
    lastEmailAt: lastEmail?.sentAt || null,
  };
}

/**
 * Update or create relationship strength record for a person
 */
export async function updateRelationshipStrength(
  personId: string,
  includeAISummary: boolean = false
): Promise<void> {
  const result = await calculateRelationshipStrength(personId);
  if (!result) return;

  // Get AI summary if requested
  let aiSummary: string | null = null;
  let aiRecommendation: string | null = null;

  if (includeAISummary && result.totalEmails > 0) {
    const summary = await generateRelationshipSummary(personId);
    if (summary) {
      aiSummary = summary.summary;

      // Generate recommendation based on trend and strength
      if (result.trend === 'weakening' && result.strength < 0.5) {
        aiRecommendation = 'Relationship may need attention. Consider reaching out soon.';
      } else if (result.strength >= 0.8) {
        aiRecommendation = 'Strong relationship. Continue regular engagement.';
      } else if (result.factors.reciprocity < 0.4) {
        aiRecommendation = 'Communication is one-sided. Try to balance the exchange.';
      }
    }
  }

  // Upsert relationship strength record
  await prisma.relationshipStrength.upsert({
    where: { personId },
    create: {
      personId,
      strength: new Decimal(result.strength),
      trend: result.trend,
      recencyScore: new Decimal(result.factors.recency),
      frequencyScore: new Decimal(result.factors.frequency),
      engagementScore: new Decimal(result.factors.engagement),
      reciprocityScore: new Decimal(result.factors.reciprocity),
      totalEmails: result.totalEmails,
      lastEmailAt: result.lastEmailAt,
      aiSummary,
      aiRecommendation,
      calculatedAt: new Date(),
    },
    update: {
      strength: new Decimal(result.strength),
      trend: result.trend,
      recencyScore: new Decimal(result.factors.recency),
      frequencyScore: new Decimal(result.factors.frequency),
      engagementScore: new Decimal(result.factors.engagement),
      reciprocityScore: new Decimal(result.factors.reciprocity),
      totalEmails: result.totalEmails,
      lastEmailAt: result.lastEmailAt,
      aiSummary,
      aiRecommendation,
      calculatedAt: new Date(),
    },
  });
}

/**
 * Batch update relationship strength for all linked persons
 */
export async function updateAllRelationshipStrengths(
  includeAISummary: boolean = false
): Promise<{ updated: number; errors: number }> {
  // Get all unique person IDs with email links
  const personIds = await prisma.emailPersonLink.findMany({
    distinct: ['personId'],
    select: { personId: true },
  });

  let updated = 0;
  let errors = 0;

  for (const { personId } of personIds) {
    try {
      await updateRelationshipStrength(personId, includeAISummary);
      updated++;
    } catch (error) {
      console.error(`Failed to update strength for ${personId}:`, error);
      errors++;
    }
  }

  return { updated, errors };
}
