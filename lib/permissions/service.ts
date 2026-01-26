/**
 * Content Permission Service
 * Check and manage content-level visibility permissions
 */

import { prisma } from '@/lib/db';
import type { SessionUser } from '@/lib/auth/session';

export type ContentType = 'EMAIL_MESSAGE' | 'CONVERSATION' | 'INVESTMENT' | 'DEAL';
export type ContentVisibility = 'PRIVATE' | 'SHARED' | 'RESTRICTED';

export interface ContentAccessResult {
  canView: boolean;
  canViewFull: boolean;      // Can see content body
  canViewMetadata: boolean;  // Can see metadata (date, subject, participants)
  canManage: boolean;        // Can change permissions
  isOwner: boolean;          // Is user the content owner
  visibility: ContentVisibility;
  reason?: string;
}

/**
 * Check if a user can access specific content
 */
export async function checkContentAccess(
  user: SessionUser,
  contentType: ContentType,
  contentId: string
): Promise<ContentAccessResult> {
  // Owner role always has full access
  if (user.role === 'OWNER') {
    return {
      canView: true,
      canViewFull: true,
      canViewMetadata: true,
      canManage: true,
      isOwner: true,
      visibility: 'SHARED',
    };
  }

  // Get permission record
  const permission = await prisma.contentPermission.findUnique({
    where: {
      contentType_contentId: { contentType, contentId },
    },
  });

  // No permission record = use default (SHARED for backward compatibility)
  if (!permission) {
    return {
      canView: true,
      canViewFull: true,
      canViewMetadata: true,
      canManage: false,
      isOwner: false,
      visibility: 'SHARED',
    };
  }

  const isContentOwner = permission.ownerId === user.id;

  // Content owner always has full access
  if (isContentOwner) {
    return {
      canView: true,
      canViewFull: true,
      canViewMetadata: true,
      canManage: true,
      isOwner: true,
      visibility: permission.visibility as ContentVisibility,
    };
  }

  // Check visibility
  switch (permission.visibility) {
    case 'SHARED':
      return {
        canView: true,
        canViewFull: true,
        canViewMetadata: true,
        canManage: false,
        isOwner: false,
        visibility: 'SHARED',
      };

    case 'RESTRICTED':
      const hasExplicitAccess = permission.allowedUserIds.includes(user.id);
      return {
        canView: true,
        canViewFull: hasExplicitAccess,
        canViewMetadata: !permission.hideParticipants,
        canManage: false,
        isOwner: false,
        visibility: 'RESTRICTED',
        reason: hasExplicitAccess ? undefined : 'Access restricted to specific users',
      };

    case 'PRIVATE':
      return {
        canView: true,
        canViewFull: false,
        canViewMetadata: !permission.hideParticipants,
        canManage: false,
        isOwner: false,
        visibility: 'PRIVATE',
        reason: 'This content is private',
      };

    default:
      return {
        canView: false,
        canViewFull: false,
        canViewMetadata: false,
        canManage: false,
        isOwner: false,
        visibility: permission.visibility as ContentVisibility,
      };
  }
}

/**
 * Set content visibility
 */
export async function setContentVisibility(
  user: SessionUser,
  contentType: ContentType,
  contentId: string,
  visibility: ContentVisibility,
  options?: {
    allowedUserIds?: string[];
    hideParticipants?: boolean;
  }
): Promise<void> {
  // Check permission to manage
  const access = await checkContentAccess(user, contentType, contentId);
  if (!access.canManage && user.role !== 'OWNER') {
    throw new Error('Not authorized to change visibility');
  }

  await prisma.contentPermission.upsert({
    where: {
      contentType_contentId: { contentType, contentId },
    },
    create: {
      contentType,
      contentId,
      ownerId: user.id,
      visibility,
      allowedUserIds: options?.allowedUserIds || [],
      hideParticipants: options?.hideParticipants || false,
    },
    update: {
      visibility,
      allowedUserIds: options?.allowedUserIds,
      hideParticipants: options?.hideParticipants,
    },
  });

  // Log the action
  await prisma.accessLog.create({
    data: {
      userId: user.id,
      contentType,
      contentId,
      action: 'CHANGE_VISIBILITY',
      metadata: { visibility, allowedUserIds: options?.allowedUserIds },
    },
  });
}

/**
 * Request access to private content
 */
export async function requestAccess(
  user: SessionUser,
  contentType: ContentType,
  contentId: string,
  reason?: string
): Promise<void> {
  // Get content owner
  const permission = await prisma.contentPermission.findUnique({
    where: { contentType_contentId: { contentType, contentId } },
  });

  if (!permission) {
    throw new Error('Content not found or already accessible');
  }

  // Check for existing pending request
  const existingRequest = await prisma.accessRequest.findFirst({
    where: {
      requesterId: user.id,
      contentType,
      contentId,
      status: 'PENDING',
    },
  });

  if (existingRequest) {
    throw new Error('Request already pending');
  }

  await prisma.accessRequest.create({
    data: {
      requesterId: user.id,
      contentType,
      contentId,
      ownerId: permission.ownerId,
      reason,
    },
  });

  // Log the action
  await prisma.accessLog.create({
    data: {
      userId: user.id,
      contentType,
      contentId,
      action: 'REQUEST_ACCESS',
    },
  });
}

/**
 * Grant access to a user
 */
export async function grantAccess(
  user: SessionUser,
  requestId: string,
  options?: { note?: string }
): Promise<void> {
  const request = await prisma.accessRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error('Request not found');
  }

  // Verify ownership
  if (request.ownerId !== user.id && user.role !== 'OWNER') {
    throw new Error('Not authorized');
  }

  // Update request
  await prisma.accessRequest.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      respondedAt: new Date(),
      responseNote: options?.note,
    },
  });

  // Add user to allowed list
  await prisma.contentPermission.update({
    where: {
      contentType_contentId: {
        contentType: request.contentType,
        contentId: request.contentId,
      },
    },
    data: {
      visibility: 'RESTRICTED',
      allowedUserIds: {
        push: request.requesterId,
      },
    },
  });

  // Log
  await prisma.accessLog.create({
    data: {
      userId: user.id,
      contentType: request.contentType,
      contentId: request.contentId,
      action: 'GRANT_ACCESS',
      metadata: { grantedTo: request.requesterId },
    },
  });
}

/**
 * Deny access request
 */
export async function denyAccess(
  user: SessionUser,
  requestId: string,
  options?: { note?: string }
): Promise<void> {
  const request = await prisma.accessRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error('Request not found');
  }

  // Verify ownership
  if (request.ownerId !== user.id && user.role !== 'OWNER') {
    throw new Error('Not authorized');
  }

  await prisma.accessRequest.update({
    where: { id: requestId },
    data: {
      status: 'DENIED',
      respondedAt: new Date(),
      responseNote: options?.note,
    },
  });
}

/**
 * Log content access
 */
export async function logAccess(
  user: SessionUser,
  contentType: ContentType,
  contentId: string,
  action: 'VIEW_METADATA' | 'VIEW_FULL'
): Promise<void> {
  await prisma.accessLog.create({
    data: {
      userId: user.id,
      contentType,
      contentId,
      action,
    },
  });
}

/**
 * Get pending access requests for a user (as owner)
 */
export async function getPendingRequests(user: SessionUser) {
  return prisma.accessRequest.findMany({
    where: {
      ownerId: user.id,
      status: 'PENDING',
    },
    include: {
      requester: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
