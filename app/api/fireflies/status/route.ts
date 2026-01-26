/**
 * Fireflies Status Route
 * GET: Check connection status and sync stats
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { getFirefliesSyncStats } from '@/lib/fireflies/sync-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user's Fireflies connection
    const connection = await prisma.firefliesConnection.findFirst({
      where: { ownerUserId: user.id },
      select: {
        id: true,
        email: true,
        firefliesUserId: true,
        lastSyncAt: true,
        syncCursor: true,
        webhookEnabled: true,
        createdAt: true,
      },
    });

    if (!connection) {
      return NextResponse.json({
        connected: false,
        connection: null,
        stats: null,
      });
    }

    // Get sync statistics
    const stats = await getFirefliesSyncStats(connection.id);

    return NextResponse.json({
      connected: true,
      connection: {
        email: connection.email,
        firefliesUserId: connection.firefliesUserId,
        lastSyncAt: connection.lastSyncAt,
        syncCursor: connection.syncCursor,
        webhookEnabled: connection.webhookEnabled,
        connectedAt: connection.createdAt,
      },
      stats,
    });
  } catch (error) {
    console.error('Fireflies status error:', error);
    return NextResponse.json(
      { error: 'Failed to get Fireflies status' },
      { status: 500 }
    );
  }
}
