/**
 * Gmail Disconnect Route
 * Disconnects Gmail and optionally deletes synced data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { deleteEmails = false } = body;

    // Get the first (and likely only) Gmail connection
    const connection = await prisma.gmailConnection.findFirst();

    if (!connection) {
      return NextResponse.json(
        { error: 'No Gmail connection found' },
        { status: 404 }
      );
    }

    // Revoke the token with Google (optional, best effort)
    try {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${connection.accessToken}`,
        { method: 'POST' }
      );
    } catch {
      // Ignore revocation errors
    }

    // Delete emails if requested
    if (deleteEmails) {
      // Delete in correct order due to foreign key constraints
      await prisma.emailPersonLink.deleteMany({});
      await prisma.emailOrgLink.deleteMany({});
      await prisma.emailMessage.deleteMany({});
    }

    // Delete the connection
    await prisma.gmailConnection.delete({
      where: { id: connection.id },
    });

    return NextResponse.json({
      success: true,
      emailsDeleted: deleteEmails,
    });
  } catch (error) {
    console.error('Gmail disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Gmail' },
      { status: 500 }
    );
  }
}
