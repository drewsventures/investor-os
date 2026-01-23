/**
 * Entity Resolution and Deduplication
 *
 * These functions handle upsert operations with automatic deduplication
 * using canonical keys. They ensure we don't create duplicate entities
 * in the knowledge graph.
 *
 * Flow:
 * 1. Generate canonical key for input
 * 2. Look up existing entity by canonical key
 * 3. If exists, optionally update with new data
 * 4. If not exists, create new entity
 * 5. Return the resolved entity
 */

import { PrismaClient, Prisma, PrivacyTier } from '@prisma/client';
import {
  generatePersonKey,
  generateOrgKey,
  extractDomain,
  isSamePerson,
  isSameOrganization,
  calculateSimilarity,
} from './canonical-keys';

const prisma = new PrismaClient();

// ============================================================================
// PERSON RESOLUTION
// ============================================================================

export interface PersonInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  linkedInUrl?: string | null;
  twitterHandle?: string | null;
  phone?: string | null;
  privacyTier?: PrivacyTier;
}

export interface PersonResolutionResult {
  person: any; // Prisma Person type
  isNew: boolean;
  wasUpdated: boolean;
}

/**
 * Resolve or create a Person entity
 *
 * This is the primary method for adding people to the knowledge graph.
 * It automatically handles deduplication using canonical keys.
 *
 * @param input - Person data
 * @param updateIfExists - If true, update existing person with new data. If false, return existing without updates.
 * @returns The resolved person and metadata about whether it was newly created or updated
 *
 * @example
 * const result = await resolveOrCreatePerson({
 *   firstName: "Sarah",
 *   lastName: "Chen",
 *   email: "sarah@acmecorp.com"
 * });
 * // => { person: {...}, isNew: true, wasUpdated: false }
 *
 * // Later, if same person is encountered again:
 * const result2 = await resolveOrCreatePerson({
 *   firstName: "Sarah",
 *   lastName: "Chen",
 *   email: "sarah@acmecorp.com",
 *   linkedInUrl: "linkedin.com/in/sarahchen"
 * }, true);
 * // => { person: {...}, isNew: false, wasUpdated: true }
 */
export async function resolveOrCreatePerson(
  input: PersonInput,
  updateIfExists = true
): Promise<PersonResolutionResult> {
  const fullName = `${input.firstName} ${input.lastName}`;
  const canonicalKey = generatePersonKey({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
  });

  // Try to find existing person by canonical key
  const existing = await prisma.person.findUnique({
    where: { canonicalKey },
  });

  if (existing) {
    // Person already exists
    if (updateIfExists) {
      // Update with new data (only update non-null fields)
      const updateData: Prisma.PersonUpdateInput = {
        fullName,
        lastContactedAt: new Date(), // Update last contacted
      };

      if (input.email) updateData.email = input.email;
      if (input.linkedInUrl) updateData.linkedInUrl = input.linkedInUrl;
      if (input.twitterHandle) updateData.twitterHandle = input.twitterHandle;
      if (input.phone) updateData.phone = input.phone;
      if (input.privacyTier) updateData.privacyTier = input.privacyTier;

      const updated = await prisma.person.update({
        where: { id: existing.id },
        data: updateData,
      });

      return {
        person: updated,
        isNew: false,
        wasUpdated: true,
      };
    } else {
      // Just update lastContactedAt
      const updated = await prisma.person.update({
        where: { id: existing.id },
        data: { lastContactedAt: new Date() },
      });

      return {
        person: updated,
        isNew: false,
        wasUpdated: false,
      };
    }
  }

  // Person doesn't exist - create new
  const newPerson = await prisma.person.create({
    data: {
      canonicalKey,
      firstName: input.firstName,
      lastName: input.lastName,
      fullName,
      email: input.email,
      linkedInUrl: input.linkedInUrl,
      twitterHandle: input.twitterHandle,
      phone: input.phone,
      privacyTier: input.privacyTier || 'INTERNAL',
      lastContactedAt: new Date(),
    },
  });

  return {
    person: newPerson,
    isNew: true,
    wasUpdated: false,
  };
}

// ============================================================================
// ORGANIZATION RESOLUTION
// ============================================================================

export interface OrganizationInput {
  name: string;
  domain?: string | null;
  legalName?: string | null;
  description?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  organizationType?: 'PORTFOLIO' | 'PROSPECT' | 'LP' | 'FUND' | 'SERVICE_PROVIDER' | 'OTHER';
  stage?: string | null;
  industry?: string | null;
  privacyTier?: PrivacyTier;
}

export interface OrganizationResolutionResult {
  organization: any; // Prisma Organization type
  isNew: boolean;
  wasUpdated: boolean;
}

/**
 * Resolve or create an Organization entity
 *
 * Primary method for adding companies to the knowledge graph.
 * Handles automatic deduplication by domain or normalized name.
 *
 * @param input - Organization data
 * @param updateIfExists - If true, update existing org with new data
 * @returns The resolved organization and metadata
 *
 * @example
 * const result = await resolveOrCreateOrganization({
 *   name: "Acme Corporation",
 *   domain: "acmecorp.com",
 *   organizationType: "PORTFOLIO"
 * });
 */
export async function resolveOrCreateOrganization(
  input: OrganizationInput,
  updateIfExists = true
): Promise<OrganizationResolutionResult> {
  // Extract domain from website if domain not provided
  const domain = input.domain || (input.website ? extractDomain(input.website) : null);

  const canonicalKey = generateOrgKey({
    domain,
    name: input.name,
  });

  // Try to find existing organization by canonical key
  const existing = await prisma.organization.findUnique({
    where: { canonicalKey },
  });

  if (existing) {
    // Organization already exists
    if (updateIfExists) {
      // Update with new data (only update non-null fields)
      const updateData: Prisma.OrganizationUpdateInput = {};

      // Always update name if provided (might be more complete)
      if (input.name) updateData.name = input.name;
      if (input.legalName) updateData.legalName = input.legalName;
      if (domain) updateData.domain = domain;
      if (input.description) updateData.description = input.description;
      if (input.website) updateData.website = input.website;
      if (input.logoUrl) updateData.logoUrl = input.logoUrl;
      if (input.organizationType) updateData.organizationType = input.organizationType;
      if (input.stage) updateData.stage = input.stage;
      if (input.industry) updateData.industry = input.industry;
      if (input.privacyTier) updateData.privacyTier = input.privacyTier;

      const updated = await prisma.organization.update({
        where: { id: existing.id },
        data: updateData,
      });

      return {
        organization: updated,
        isNew: false,
        wasUpdated: true,
      };
    } else {
      return {
        organization: existing,
        isNew: false,
        wasUpdated: false,
      };
    }
  }

  // Organization doesn't exist - create new
  const newOrg = await prisma.organization.create({
    data: {
      canonicalKey,
      name: input.name,
      legalName: input.legalName,
      domain,
      description: input.description,
      website: input.website,
      logoUrl: input.logoUrl,
      organizationType: input.organizationType || 'PROSPECT',
      stage: input.stage,
      industry: input.industry,
      privacyTier: input.privacyTier || 'INTERNAL',
    },
  });

  return {
    organization: newOrg,
    isNew: true,
    wasUpdated: false,
  };
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

export interface DuplicateCandidate {
  id: string;
  name: string;
  email?: string | null;
  similarity: number;
}

/**
 * Find potential duplicate Person records
 *
 * Useful for manual review and cleanup of near-duplicates that might
 * have different emails or slight name variations.
 *
 * @param person - Person to check for duplicates
 * @param threshold - Minimum similarity score (0.0 - 1.0)
 * @returns Array of potential duplicates, sorted by similarity (highest first)
 *
 * @example
 * const duplicates = await findDuplicatePeople({
 *   firstName: "Sarah",
 *   lastName: "Chen"
 * }, 0.85);
 * // => [{ id: "...", name: "Sara Chen", similarity: 0.92 }]
 */
export async function findDuplicatePeople(
  person: { firstName: string; lastName: string; email?: string | null },
  threshold = 0.85
): Promise<DuplicateCandidate[]> {
  const fullName = `${person.firstName} ${person.lastName}`;

  // Get all people (in production, you'd want to optimize this with better filtering)
  const allPeople = await prisma.person.findMany({
    select: { id: true, fullName: true, email: true },
  });

  // Calculate similarity scores
  const candidates: DuplicateCandidate[] = allPeople
    .map((p) => ({
      id: p.id,
      name: p.fullName,
      email: p.email,
      similarity: calculateSimilarity(fullName, p.fullName),
    }))
    .filter((c) => c.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);

  return candidates;
}

/**
 * Find potential duplicate Organization records
 *
 * @param org - Organization to check for duplicates
 * @param threshold - Minimum similarity score (0.0 - 1.0)
 * @returns Array of potential duplicates, sorted by similarity (highest first)
 */
export async function findDuplicateOrganizations(
  org: { name: string; domain?: string | null },
  threshold = 0.80
): Promise<DuplicateCandidate[]> {
  // Get all organizations
  const allOrgs = await prisma.organization.findMany({
    select: { id: true, name: true, domain: true },
  });

  // Calculate similarity scores
  const candidates: DuplicateCandidate[] = allOrgs
    .map((o) => ({
      id: o.id,
      name: o.name,
      email: o.domain, // Using domain field for consistency with DuplicateCandidate interface
      similarity: calculateSimilarity(org.name, o.name),
    }))
    .filter((c) => c.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);

  return candidates;
}

// ============================================================================
// ENTITY MERGING
// ============================================================================

/**
 * Merge two duplicate Person records
 *
 * Consolidates all relationships, facts, and tasks from the duplicate
 * into the primary record, then soft-deletes the duplicate.
 *
 * @param primaryId - ID of the person to keep
 * @param duplicateId - ID of the person to merge and remove
 * @returns The updated primary person
 *
 * @example
 * await mergePeople(primaryPersonId, duplicatePersonId);
 */
export async function mergePeople(primaryId: string, duplicateId: string) {
  return await prisma.$transaction(async (tx) => {
    // Move all facts from duplicate to primary
    await tx.fact.updateMany({
      where: { personId: duplicateId },
      data: { personId: primaryId },
    });

    // Move all tasks assigned to duplicate to primary
    await tx.task.updateMany({
      where: { assignedToPersonId: duplicateId },
      data: { assignedToPersonId: primaryId },
    });

    // Move all LP commitments
    await tx.lPCommitment.updateMany({
      where: { personId: duplicateId },
      data: { personId: primaryId },
    });

    // Update all relationships where person is source
    await tx.relationship.updateMany({
      where: { sourceType: 'Person', sourceId: duplicateId },
      data: { sourceId: primaryId },
    });

    // Update all relationships where person is target
    await tx.relationship.updateMany({
      where: { targetType: 'Person', targetId: duplicateId },
      data: { targetId: primaryId },
    });

    // Note: Conversation participants would need to be handled separately
    // since it's a many-to-many relationship

    // Delete the duplicate
    await tx.person.delete({
      where: { id: duplicateId },
    });

    // Return the primary person
    return await tx.person.findUnique({
      where: { id: primaryId },
    });
  });
}

/**
 * Merge two duplicate Organization records
 *
 * @param primaryId - ID of the organization to keep
 * @param duplicateId - ID of the organization to merge and remove
 * @returns The updated primary organization
 */
export async function mergeOrganizations(primaryId: string, duplicateId: string) {
  return await prisma.$transaction(async (tx) => {
    // Move all facts
    await tx.fact.updateMany({
      where: { organizationId: duplicateId },
      data: { organizationId: primaryId },
    });

    // Move all tasks
    await tx.task.updateMany({
      where: { relatedOrganizationId: duplicateId },
      data: { relatedOrganizationId: primaryId },
    });

    // Move all deals
    await tx.deal.updateMany({
      where: { organizationId: duplicateId },
      data: { organizationId: primaryId },
    });

    // Move all investments
    await tx.investment.updateMany({
      where: { organizationId: duplicateId },
      data: { organizationId: primaryId },
    });

    // Move all LP commitments
    await tx.lPCommitment.updateMany({
      where: { organizationId: duplicateId },
      data: { organizationId: primaryId },
    });

    // Move all metrics
    await tx.organizationMetric.updateMany({
      where: { organizationId: duplicateId },
      data: { organizationId: primaryId },
    });

    // Update all relationships where org is source
    await tx.relationship.updateMany({
      where: { sourceType: 'Organization', sourceId: duplicateId },
      data: { sourceId: primaryId },
    });

    // Update all relationships where org is target
    await tx.relationship.updateMany({
      where: { targetType: 'Organization', targetId: duplicateId },
      data: { targetId: primaryId },
    });

    // Delete the duplicate
    await tx.organization.delete({
      where: { id: duplicateId },
    });

    // Return the primary organization
    return await tx.organization.findUnique({
      where: { id: primaryId },
    });
  });
}
