/**
 * Gmail Messages Route
 * Query synced email messages with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Filters
    const personId = searchParams.get('personId');
    const organizationId = searchParams.get('organizationId');
    const threadId = searchParams.get('threadId');
    const search = searchParams.get('search');
    const isInbound = searchParams.get('isInbound');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    interface WhereClause {
      gmailThreadId?: string;
      OR?: Array<Record<string, unknown>>;
      isInbound?: boolean;
      sentAt?: { gte?: Date; lte?: Date };
      personLinks?: { some: { personId: string } };
      orgLinks?: { some: { organizationId: string } };
    }
    const where: WhereClause = {};

    if (threadId) {
      where.gmailThreadId = threadId;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { snippet: { contains: search, mode: 'insensitive' } },
        { fromEmail: { contains: search, mode: 'insensitive' } },
        { fromName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isInbound !== null && isInbound !== undefined) {
      where.isInbound = isInbound === 'true';
    }

    // Build date range filter
    if (startDate || endDate) {
      where.sentAt = {};
      if (startDate) {
        where.sentAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.sentAt.lte = new Date(endDate);
      }
    }

    // Filter by person
    if (personId) {
      where.personLinks = {
        some: { personId },
      };
    }

    // Filter by organization
    if (organizationId) {
      where.orgLinks = {
        some: { organizationId },
      };
    }

    // Fetch messages
    const [messages, total] = await Promise.all([
      prisma.emailMessage.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          personLinks: {
            include: {
              person: {
                select: { id: true, fullName: true, email: true },
              },
            },
          },
          orgLinks: {
            include: {
              organization: {
                select: { id: true, name: true, domain: true },
              },
            },
          },
        },
      }),
      prisma.emailMessage.count({ where }),
    ]);

    // Transform for response
    const transformedMessages = messages.map((msg) => ({
      id: msg.id,
      gmailMessageId: msg.gmailMessageId,
      threadId: msg.gmailThreadId,
      subject: msg.subject,
      snippet: msg.snippet,
      bodyText: msg.bodyText,
      from: {
        email: msg.fromEmail,
        name: msg.fromName,
      },
      to: msg.toEmails,
      cc: msg.ccEmails,
      sentAt: msg.sentAt,
      isInbound: msg.isInbound,
      hasAttachments: msg.hasAttachments,
      labels: msg.labels,
      // AI fields
      aiSummary: msg.aiSummary,
      aiActionItems: msg.aiActionItems,
      // Linked entities
      linkedPersons: msg.personLinks.map((link) => ({
        id: link.person.id,
        name: link.person.fullName,
        email: link.person.email,
        role: link.role,
      })),
      linkedOrganizations: msg.orgLinks.map((link) => ({
        id: link.organization.id,
        name: link.organization.name,
        domain: link.organization.domain,
      })),
    }));

    return NextResponse.json({
      messages: transformedMessages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Gmail messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
