/**
 * Gmail Status Route
 * Returns connection status and sync statistics
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get the first Gmail connection
    const connection = await prisma.gmailConnection.findFirst({
      select: {
        id: true,
        email: true,
        lastSyncAt: true,
        tokenExpiresAt: true,
        createdAt: true,
      },
    });

    if (!connection) {
      return NextResponse.json({
        connected: false,
        email: null,
        stats: null,
      });
    }

    // Get email statistics
    const [
      totalEmails,
      personLinkCount,
      orgLinkCount,
      inboundCount,
      outboundCount,
      dateRange,
      topContacts,
    ] = await Promise.all([
      prisma.emailMessage.count(),
      prisma.emailPersonLink.count(),
      prisma.emailOrgLink.count(),
      prisma.emailMessage.count({ where: { isInbound: true } }),
      prisma.emailMessage.count({ where: { isInbound: false } }),
      prisma.emailMessage.aggregate({
        _min: { sentAt: true },
        _max: { sentAt: true },
      }),
      // Get top contacts by email count
      prisma.emailPersonLink.groupBy({
        by: ['personId'],
        _count: { personId: true },
        orderBy: { _count: { personId: 'desc' } },
        take: 5,
      }),
    ]);

    // Get person names for top contacts
    const topContactIds = topContacts.map((c) => c.personId);
    const topContactPersons =
      topContactIds.length > 0
        ? await prisma.person.findMany({
            where: { id: { in: topContactIds } },
            select: { id: true, fullName: true, email: true },
          })
        : [];

    const topContactsWithNames = topContacts.map((c) => {
      const person = topContactPersons.find((p) => p.id === c.personId);
      return {
        personId: c.personId,
        name: person?.fullName || 'Unknown',
        email: person?.email,
        emailCount: c._count.personId,
      };
    });

    return NextResponse.json({
      connected: true,
      email: connection.email,
      connectedAt: connection.createdAt,
      lastSyncAt: connection.lastSyncAt,
      tokenExpiresAt: connection.tokenExpiresAt,
      stats: {
        totalEmails,
        inboundEmails: inboundCount,
        outboundEmails: outboundCount,
        linkedPersons: personLinkCount,
        linkedOrganizations: orgLinkCount,
        oldestEmail: dateRange._min.sentAt,
        newestEmail: dateRange._max.sentAt,
        topContacts: topContactsWithNames,
      },
    });
  } catch (error) {
    console.error('Gmail status error:', error);
    return NextResponse.json(
      { error: 'Failed to get Gmail status' },
      { status: 500 }
    );
  }
}
