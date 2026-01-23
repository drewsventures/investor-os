/**
 * Conflict Detection and Resolution
 *
 * When new facts are added to the knowledge graph, they might conflict with
 * existing facts. This module handles detecting conflicts and resolving them
 * according to configurable strategies.
 *
 * Example conflict:
 * - Existing fact: MRR = $50,000 (from email on 2024-01-01)
 * - New fact: MRR = $60,000 (from Fireflies call on 2024-01-15)
 *
 * Resolution strategies:
 * - latest_wins: Keep the most recent fact
 * - highest_confidence: Keep the fact with highest confidence score
 * - user_confirm: Flag for manual review
 * - merge: Combine both facts (for notes/text fields)
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// TYPES
// ============================================================================

export type ConflictResolutionStrategy =
  | 'latest_wins'
  | 'highest_confidence'
  | 'user_confirm'
  | 'merge';

export interface FactInput {
  personId?: string | null;
  organizationId?: string | null;
  dealId?: string | null;
  conversationId?: string | null;
  factType: string;
  key: string;
  value: string;
  sourceType: string;
  sourceId?: string | null;
  sourceUrl?: string | null;
  confidence?: number;
  createdBy?: string | null;
}

export interface ConflictingFact {
  id: string;
  value: string;
  sourceType: string;
  sourceId: string | null;
  confidence: number;
  validFrom: Date;
  createdAt: Date;
}

export interface Conflict {
  newFact: FactInput;
  existingFacts: ConflictingFact[];
  suggestedStrategy: ConflictResolutionStrategy;
  reason: string;
}

export interface ConflictResolution {
  action: 'use_new' | 'keep_existing' | 'merge' | 'manual_review';
  resultingFactId?: string;
  invalidatedFactIds?: string[];
}

// ============================================================================
// CONFLICT STRATEGIES BY FACT TYPE
// ============================================================================

/**
 * Define how conflicts should be resolved for different fact types
 */
const CONFLICT_STRATEGIES: Record<string, ConflictResolutionStrategy> = {
  // Contact info - user should confirm changes
  email: 'user_confirm',
  phone: 'user_confirm',
  linkedIn: 'user_confirm',

  // Metrics - latest typically wins (they change over time)
  MRR: 'latest_wins',
  ARR: 'latest_wins',
  burn_rate: 'latest_wins',
  runway: 'latest_wins',
  team_size: 'latest_wins',
  valuation: 'latest_wins',

  // Notes/descriptions - merge them
  notes: 'merge',
  description: 'merge',

  // High-stakes info - user should confirm
  valuation_cap: 'user_confirm',
  ownership: 'user_confirm',
  investment_amount: 'user_confirm',

  // Default strategy for unknown fact types
  _default: 'highest_confidence',
};

/**
 * Get the appropriate resolution strategy for a fact type
 */
export function getStrategyForFactType(factType: string): ConflictResolutionStrategy {
  return CONFLICT_STRATEGIES[factType] || CONFLICT_STRATEGIES._default;
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Detect if a new fact conflicts with existing facts
 *
 * A conflict occurs when:
 * 1. A fact exists with the same entity, factType, and key
 * 2. The value is different
 * 3. The existing fact is still valid (validUntil is null)
 *
 * @param newFact - The new fact to check
 * @returns Conflict object if conflict detected, null otherwise
 *
 * @example
 * const conflict = await detectConflict({
 *   organizationId: "org_123",
 *   factType: "metric",
 *   key: "MRR",
 *   value: "60000",
 *   sourceType: "fireflies",
 *   confidence: 0.9
 * });
 *
 * if (conflict) {
 *   console.log(`Conflict detected: ${conflict.reason}`);
 *   console.log(`Strategy: ${conflict.suggestedStrategy}`);
 * }
 */
export async function detectConflict(newFact: FactInput): Promise<Conflict | null> {
  // Build the where clause based on which entity ID is provided
  const where: Prisma.FactWhereInput = {
    factType: newFact.factType,
    key: newFact.key,
    validUntil: null, // Only check facts that are currently valid
  };

  if (newFact.personId) {
    where.personId = newFact.personId;
  } else if (newFact.organizationId) {
    where.organizationId = newFact.organizationId;
  } else if (newFact.dealId) {
    where.dealId = newFact.dealId;
  } else if (newFact.conversationId) {
    where.conversationId = newFact.conversationId;
  }

  // Find existing facts with same entity, type, and key
  const existingFacts = await prisma.fact.findMany({
    where,
    select: {
      id: true,
      value: true,
      sourceType: true,
      sourceId: true,
      confidence: true,
      validFrom: true,
      createdAt: true,
    },
  });

  // Filter to only facts with different values
  const conflictingFacts = existingFacts.filter((f) => f.value !== newFact.value);

  if (conflictingFacts.length === 0) {
    return null; // No conflict
  }

  // Determine suggested resolution strategy
  const strategy = getStrategyForFactType(newFact.factType);

  // Build reason message
  const reason = buildConflictReason(newFact, conflictingFacts);

  return {
    newFact,
    existingFacts: conflictingFacts,
    suggestedStrategy: strategy,
    reason,
  };
}

/**
 * Build a human-readable reason for the conflict
 */
function buildConflictReason(newFact: FactInput, existing: ConflictingFact[]): string {
  const entityType = newFact.personId
    ? 'Person'
    : newFact.organizationId
    ? 'Organization'
    : newFact.dealId
    ? 'Deal'
    : 'Conversation';

  const oldValues = existing.map((f) => `"${f.value}" (from ${f.sourceType})`).join(', ');

  return `Conflicting ${newFact.key} values for ${entityType}: ` +
    `existing = ${oldValues}, ` +
    `new = "${newFact.value}" (from ${newFact.sourceType})`;
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

/**
 * Resolve a conflict according to the specified strategy
 *
 * @param conflict - The conflict to resolve
 * @param strategy - How to resolve it (overrides suggestedStrategy if provided)
 * @returns Resolution result with action taken and affected fact IDs
 *
 * @example
 * const resolution = await resolveConflict(conflict, 'latest_wins');
 * // => { action: 'use_new', resultingFactId: '...', invalidatedFactIds: ['...'] }
 */
export async function resolveConflict(
  conflict: Conflict,
  strategy?: ConflictResolutionStrategy
): Promise<ConflictResolution> {
  const resolveStrategy = strategy || conflict.suggestedStrategy;

  switch (resolveStrategy) {
    case 'latest_wins':
      return await resolveWithLatestWins(conflict);

    case 'highest_confidence':
      return await resolveWithHighestConfidence(conflict);

    case 'merge':
      return await resolveWithMerge(conflict);

    case 'user_confirm':
      // Don't auto-resolve - flag for manual review
      return {
        action: 'manual_review',
      };

    default:
      throw new Error(`Unknown resolution strategy: ${resolveStrategy}`);
  }
}

/**
 * Strategy: Keep the most recent fact
 */
async function resolveWithLatestWins(conflict: Conflict): Promise<ConflictResolution> {
  return await prisma.$transaction(async (tx) => {
    // Invalidate all existing facts
    const invalidatedIds = conflict.existingFacts.map((f) => f.id);
    await tx.fact.updateMany({
      where: { id: { in: invalidatedIds } },
      data: {
        validUntil: new Date(),
        replacedByFact: 'pending', // Will update after creating new fact
      },
    });

    // Create the new fact
    const newFactRecord = await tx.fact.create({
      data: {
        personId: conflict.newFact.personId,
        organizationId: conflict.newFact.organizationId,
        dealId: conflict.newFact.dealId,
        conversationId: conflict.newFact.conversationId,
        factType: conflict.newFact.factType,
        key: conflict.newFact.key,
        value: conflict.newFact.value,
        sourceType: conflict.newFact.sourceType,
        sourceId: conflict.newFact.sourceId,
        sourceUrl: conflict.newFact.sourceUrl,
        confidence: conflict.newFact.confidence || 1.0,
        createdBy: conflict.newFact.createdBy,
        validFrom: new Date(),
        validUntil: null,
      },
    });

    // Update replaced facts to point to new fact
    await tx.fact.updateMany({
      where: { id: { in: invalidatedIds } },
      data: { replacedByFact: newFactRecord.id },
    });

    return {
      action: 'use_new',
      resultingFactId: newFactRecord.id,
      invalidatedFactIds: invalidatedIds,
    };
  });
}

/**
 * Strategy: Keep the fact with highest confidence score
 */
async function resolveWithHighestConfidence(
  conflict: Conflict
): Promise<ConflictResolution> {
  const newConfidence = conflict.newFact.confidence || 1.0;
  const maxExistingConfidence = Math.max(
    ...conflict.existingFacts.map((f) => Number(f.confidence))
  );

  if (newConfidence > maxExistingConfidence) {
    // New fact wins
    return await resolveWithLatestWins(conflict); // Same implementation as latest_wins
  } else {
    // Existing fact wins - don't create new fact
    return {
      action: 'keep_existing',
    };
  }
}

/**
 * Strategy: Merge text values (for notes, descriptions)
 */
async function resolveWithMerge(conflict: Conflict): Promise<ConflictResolution> {
  return await prisma.$transaction(async (tx) => {
    // Combine all values with source attribution
    const existingValues = conflict.existingFacts.map(
      (f) => `[${f.sourceType}]: ${f.value}`
    );
    const newValue = `[${conflict.newFact.sourceType}]: ${conflict.newFact.value}`;
    const mergedValue = [...existingValues, newValue].join('\n\n');

    // Invalidate existing facts
    const invalidatedIds = conflict.existingFacts.map((f) => f.id);
    await tx.fact.updateMany({
      where: { id: { in: invalidatedIds } },
      data: {
        validUntil: new Date(),
        replacedByFact: 'pending',
      },
    });

    // Create merged fact
    const mergedFact = await tx.fact.create({
      data: {
        personId: conflict.newFact.personId,
        organizationId: conflict.newFact.organizationId,
        dealId: conflict.newFact.dealId,
        conversationId: conflict.newFact.conversationId,
        factType: conflict.newFact.factType,
        key: conflict.newFact.key,
        value: mergedValue,
        sourceType: 'merged',
        sourceId: null,
        sourceUrl: null,
        confidence: 1.0, // Merged facts are considered confirmed
        createdBy: conflict.newFact.createdBy,
        validFrom: new Date(),
        validUntil: null,
      },
    });

    // Update replaced facts
    await tx.fact.updateMany({
      where: { id: { in: invalidatedIds } },
      data: { replacedByFact: mergedFact.id },
    });

    return {
      action: 'merge',
      resultingFactId: mergedFact.id,
      invalidatedFactIds: invalidatedIds,
    };
  });
}

// ============================================================================
// ADD FACT WITH CONFLICT DETECTION
// ============================================================================

/**
 * Add a new fact to the knowledge graph with automatic conflict detection
 *
 * This is the primary method for adding facts. It:
 * 1. Detects conflicts with existing facts
 * 2. Resolves conflicts automatically (if strategy allows)
 * 3. Returns conflict info if manual review needed
 *
 * @param fact - The fact to add
 * @param forceStrategy - Override the default strategy for this fact type
 * @returns Object with created fact and conflict info (if any)
 *
 * @example
 * const result = await addFactWithConflictDetection({
 *   organizationId: "org_123",
 *   factType: "metric",
 *   key: "MRR",
 *   value: "60000",
 *   sourceType: "fireflies",
 *   sourceId: "call_456"
 * });
 *
 * if (result.conflict && result.conflict.requiresManualReview) {
 *   // Show conflict to user for manual resolution
 * } else {
 *   // Fact was added successfully
 * }
 */
export async function addFactWithConflictDetection(
  fact: FactInput,
  forceStrategy?: ConflictResolutionStrategy
): Promise<{
  factId: string | null;
  conflict: Conflict | null;
  resolution: ConflictResolution | null;
  requiresManualReview: boolean;
}> {
  // Check for conflicts
  const conflict = await detectConflict(fact);

  if (!conflict) {
    // No conflict - create fact directly
    const newFact = await prisma.fact.create({
      data: {
        personId: fact.personId,
        organizationId: fact.organizationId,
        dealId: fact.dealId,
        conversationId: fact.conversationId,
        factType: fact.factType,
        key: fact.key,
        value: fact.value,
        sourceType: fact.sourceType,
        sourceId: fact.sourceId,
        sourceUrl: fact.sourceUrl,
        confidence: fact.confidence || 1.0,
        createdBy: fact.createdBy,
        validFrom: new Date(),
        validUntil: null,
      },
    });

    return {
      factId: newFact.id,
      conflict: null,
      resolution: null,
      requiresManualReview: false,
    };
  }

  // Conflict detected - try to resolve
  const strategy = forceStrategy || conflict.suggestedStrategy;
  const resolution = await resolveConflict(conflict, strategy);

  if (resolution.action === 'manual_review') {
    // Can't auto-resolve - flag for user
    return {
      factId: null,
      conflict,
      resolution,
      requiresManualReview: true,
    };
  }

  // Conflict was auto-resolved
  return {
    factId: resolution.resultingFactId || null,
    conflict,
    resolution,
    requiresManualReview: false,
  };
}
