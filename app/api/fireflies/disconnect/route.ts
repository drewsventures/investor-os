/**
 * Fireflies Disconnect Route
 * POST: Remove connection and optionally delete synced data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { deleteMeetings = false } = body;

    // Find user's Fireflies connection
    const connection = await prisma.firefliesConnection.findFirst({
      where: { ownerUserId: user.id },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'No Fireflies connection found' },
        { status: 404 }
      );
    }

    // Delete meetings if requested
    let meetingsDeleted = 0;
    if (deleteMeetings) {
      const deleteResult = await prisma.conversation.deleteMany({
        where: { sourceType: 'fireflies' },
      });
      meetingsDeleted = deleteResult.count;
    }

    // Delete the connection
    await prisma.firefliesConnection.delete({
      where: { id: connection.id },
    });

    return NextResponse.json({
      success: true,
      meetingsDeleted: deleteMeetings ? meetingsDeleted : 0,
    });
  } catch (error) {
    console.error('Fireflies disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Fireflies' },
      { status: 500 }
    );
  }
}
