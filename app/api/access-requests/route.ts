/**
 * Access Requests API Route
 * Request and manage access to private content
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import {
  requestAccess,
  grantAccess,
  denyAccess,
  getPendingRequests,
  type ContentType,
} from '@/lib/permissions/service';

export const dynamic = 'force-dynamic';

// GET - Get pending access requests (as owner)
export const GET = withAuth(async (_request, _context, user) => {
  try {
    const requests = await getPendingRequests(user);
    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching access requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch access requests' },
      { status: 500 }
    );
  }
});

// POST - Create new access request OR respond to request
export const POST = withAuth(async (request, _context, user) => {
  try {
    const body = await request.json();

    // If requestId is provided, this is a response to a request
    if (body.requestId) {
      const { requestId, action, note } = body;

      if (!action || !['approve', 'deny'].includes(action)) {
        return NextResponse.json(
          { error: 'action must be "approve" or "deny"' },
          { status: 400 }
        );
      }

      if (action === 'approve') {
        await grantAccess(user, requestId, { note });
      } else {
        await denyAccess(user, requestId, { note });
      }

      return NextResponse.json({ success: true });
    }

    // Otherwise, this is a new access request
    const { contentType, contentId, reason } = body;

    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: 'contentType and contentId are required' },
        { status: 400 }
      );
    }

    await requestAccess(user, contentType as ContentType, contentId, reason);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling access request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
});
