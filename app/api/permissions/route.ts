/**
 * Permissions API Route
 * Manage content visibility permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import {
  checkContentAccess,
  setContentVisibility,
  type ContentType,
  type ContentVisibility,
} from '@/lib/permissions/service';

export const dynamic = 'force-dynamic';

// GET - Check access for a piece of content
export const GET = withAuth(async (request, _context, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('contentType') as ContentType;
    const contentId = searchParams.get('contentId');

    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: 'contentType and contentId are required' },
        { status: 400 }
      );
    }

    const access = await checkContentAccess(user, contentType, contentId);
    return NextResponse.json({ access });
  } catch (error) {
    console.error('Error checking permissions:', error);
    return NextResponse.json(
      { error: 'Failed to check permissions' },
      { status: 500 }
    );
  }
});

// POST - Set visibility for a piece of content
export const POST = withAuth(async (request, _context, user) => {
  try {
    const body = await request.json();
    const { contentType, contentId, visibility, allowedUserIds, hideParticipants } = body;

    if (!contentType || !contentId || !visibility) {
      return NextResponse.json(
        { error: 'contentType, contentId, and visibility are required' },
        { status: 400 }
      );
    }

    // Validate visibility value
    if (!['PRIVATE', 'SHARED', 'RESTRICTED'].includes(visibility)) {
      return NextResponse.json(
        { error: 'visibility must be PRIVATE, SHARED, or RESTRICTED' },
        { status: 400 }
      );
    }

    await setContentVisibility(
      user,
      contentType as ContentType,
      contentId,
      visibility as ContentVisibility,
      { allowedUserIds, hideParticipants }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting permissions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set permissions' },
      { status: 500 }
    );
  }
});
