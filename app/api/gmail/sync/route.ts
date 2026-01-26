/**
 * Gmail Sync Route
 * Triggers email synchronization from Gmail
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncEmails, syncIncremental, getSyncStats } from '@/lib/gmail/sync-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for long syncs

// GET - Preview what will be synced
export async function GET() {
  try {
    const connection = await prisma.gmailConnection.findFirst({
      select: {
        id: true,
        email: true,
        lastSyncAt: true,
        syncCursor: true,
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'No Gmail connection found. Please connect Gmail first.' },
        { status: 404 }
      );
    }

    const stats = await getSyncStats(connection.id);

    return NextResponse.json({
      connection: {
        email: connection.email,
        lastSyncAt: connection.lastSyncAt,
        hasHistory: !!connection.syncCursor,
      },
      stats,
      nextSync: connection.lastSyncAt
        ? { type: 'incremental', description: 'Sync new emails since last sync' }
        : { type: 'full', description: 'Initial sync - will fetch all emails' },
    });
  } catch (error) {
    console.error('Gmail sync preview error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync preview' },
      { status: 500 }
    );
  }
}

// POST - Execute sync
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const syncType = searchParams.get('type') || 'auto'; // auto, full, incremental
    const maxMessages = parseInt(searchParams.get('limit') || '1000');
    const query = searchParams.get('q') || undefined; // Gmail search query

    const connection = await prisma.gmailConnection.findFirst({
      select: { id: true, lastSyncAt: true, syncCursor: true },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'No Gmail connection found. Please connect Gmail first.' },
        { status: 404 }
      );
    }

    let result;

    if (syncType === 'full') {
      // Force full sync
      result = await syncEmails(connection.id, { maxMessages, query });
    } else if (syncType === 'incremental' && connection.syncCursor) {
      // Force incremental sync
      result = await syncIncremental(connection.id);
    } else {
      // Auto: use incremental if we have a cursor, otherwise full
      if (connection.syncCursor) {
        result = await syncIncremental(connection.id);
      } else {
        result = await syncEmails(connection.id, { maxMessages, query });
      }
    }

    return NextResponse.json({
      success: result.success,
      syncType: connection.syncCursor ? 'incremental' : 'full',
      result: {
        messagesFound: result.messagesFound,
        messagesCreated: result.messagesCreated,
        messagesSkipped: result.messagesSkipped,
        entitiesLinked: result.entitiesLinked,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('Gmail sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync emails' },
      { status: 500 }
    );
  }
}
