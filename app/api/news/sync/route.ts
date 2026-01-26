/**
 * News Sync API Route
 * POST: Fetch and store news for an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { syncOrganizationNews } from '@/lib/news/sync-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, maxArticles = 20, fromDate } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    const result = await syncOrganizationNews(organizationId, {
      maxArticles,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      authorId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('News sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync news' },
      { status: 500 }
    );
  }
}
