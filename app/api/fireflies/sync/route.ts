/**
 * Fireflies Sync Route
 * GET: Get sync preview
 * POST: Trigger manual sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import {
  syncFirefliesTranscripts,
  getSyncPreview,
} from '@/lib/fireflies/sync-service';

export const dynamic = 'force-dynamic';

/**
 * GET: Get sync preview (what would be synced)
 */
export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await prisma.firefliesConnection.findFirst({
      where: { ownerUserId: user.id },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'No Fireflies connection found' },
        { status: 404 }
      );
    }

    const preview = await getSyncPreview(connection.id);
    return NextResponse.json(preview);
  } catch (error) {
    console.error('Fireflies sync preview error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync preview' },
      { status: 500 }
    );
  }
}

/**
 * POST: Trigger manual sync
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { maxTranscripts = 100, fromDate, linkDeals = true } = body;

    const connection = await prisma.firefliesConnection.findFirst({
      where: { ownerUserId: user.id },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'No Fireflies connection found' },
        { status: 404 }
      );
    }

    // Perform sync
    const result = await syncFirefliesTranscripts(connection.id, {
      maxTranscripts,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      linkDeals,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Fireflies sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Fireflies transcripts' },
      { status: 500 }
    );
  }
}
