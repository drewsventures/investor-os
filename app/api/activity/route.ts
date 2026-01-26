/**
 * Activity Feed API Route
 * GET: Unified activity feed for entities
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getActivityFeed, getActivityCounts } from '@/lib/activity/feed-service';
import type { ActivityType } from '@/lib/activity/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const personId = searchParams.get('personId') || undefined;
    const organizationId = searchParams.get('organizationId') || undefined;
    const dealId = searchParams.get('dealId') || undefined;
    const typesParam = searchParams.get('types');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const countsOnly = searchParams.get('countsOnly') === 'true';

    // Must have at least one entity filter
    if (!personId && !organizationId && !dealId) {
      return NextResponse.json(
        { error: 'At least one of personId, organizationId, or dealId is required' },
        { status: 400 }
      );
    }

    // Parse types filter
    const types = typesParam
      ? (typesParam.split(',') as ActivityType[])
      : undefined;

    // If only counts requested
    if (countsOnly) {
      const counts = await getActivityCounts({
        personId,
        organizationId,
        dealId,
      });
      return NextResponse.json({ counts });
    }

    // Get full activity feed
    const result = await getActivityFeed({
      personId,
      organizationId,
      dealId,
      types,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Activity feed error:', error);
    return NextResponse.json(
      { error: 'Failed to get activity feed' },
      { status: 500 }
    );
  }
}
