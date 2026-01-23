/**
 * Conversations API
 * GET - List conversations with filtering
 * POST - Create a new conversation (meeting, call, email)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const personId = searchParams.get('personId');
    const dealId = searchParams.get('dealId');
    const medium = searchParams.get('medium'); // CALL, EMAIL, MEETING, etc.
    const days = searchParams.get('days'); // Last N days
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const where: any = {};

    if (organizationId) where.organizationId = organizationId;
    if (dealId) where.dealId = dealId;
    if (medium) where.medium = medium;

    // Date filtering
    if (days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      where.conversationDate = { gte: daysAgo };
    }

    // Person filter requires joining through participants
    let conversations;
    if (personId) {
      conversations = await prisma.conversation.findMany({
        where: {
          ...where,
          participants: {
            some: { personId }
          }
        },
        include: {
          organizations: {
            select: {
              id: true,
              name: true,
              organizationType: true
            }
          },
          deals: {
            select: {
              id: true,
              name: true,
              stage: true
            }
          },
          participants: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          _count: {
            select: {
              facts: true,
              tasks: true
            }
          }
        },
        orderBy: { conversationDate: 'desc' },
        take: limit
      });
    } else {
      conversations = await prisma.conversation.findMany({
        where,
        include: {
          organizations: {
            select: {
              id: true,
              name: true,
              organizationType: true
            }
          },
          deals: {
            select: {
              id: true,
              name: true,
              stage: true
            }
          },
          participants: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          _count: {
            select: {
              facts: true,
              tasks: true
            }
          }
        },
        orderBy: { conversationDate: 'desc' },
        take: limit
      });
    }

    // Format participants
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      conversationDate: conv.conversationDate,
      medium: conv.medium,
      title: conv.title,
      summary: conv.summary,
      duration: conv.duration,
      organization: conv.organizations[0],
      deal: conv.deals[0],
      participants: conv.participants.map(p => ({
        id: p.id,
        fullName: p.fullName,
        email: p.email
      })),
      factCount: conv._count.facts,
      taskCount: conv._count.tasks,
      sourceType: conv.sourceType,
      privacyTier: conv.privacyTier,
      createdAt: conv.createdAt
    }));

    // Summary stats
    const summary = {
      totalConversations: formattedConversations.length,
      byMedium: formattedConversations.reduce((acc, conv) => {
        acc[conv.medium] = (acc[conv.medium] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalFacts: formattedConversations.reduce((sum, conv) => sum + conv.factCount, 0),
      totalTasks: formattedConversations.reduce((sum, conv) => sum + conv.taskCount, 0),
      averageDuration: formattedConversations
        .filter(c => c.duration)
        .reduce((sum, conv) => sum + (conv.duration || 0), 0) /
        formattedConversations.filter(c => c.duration).length || 0
    };

    return NextResponse.json({
      conversations: formattedConversations,
      summary
    });
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      conversationDate,
      medium,
      title,
      summary,
      transcript,
      duration,
      organizationIds, // Array of organization IDs
      dealIds, // Array of deal IDs
      participantIds, // Array of person IDs
      sourceType,
      sourceId,
      sourceUrl,
      privacyTier
    } = body;

    // Validate required fields
    if (!conversationDate || !medium || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: conversationDate, medium, title' },
        { status: 400 }
      );
    }

    // Validate medium enum
    const validMediums = ['MEETING', 'EMAIL', 'CALL', 'SLACK', 'WHATSAPP', 'OTHER'];
    if (!validMediums.includes(medium)) {
      return NextResponse.json(
        { error: `Invalid medium. Must be one of: ${validMediums.join(', ')}` },
        { status: 400 }
      );
    }

    // Create conversation with participants
    const conversation = await prisma.conversation.create({
      data: {
        conversationDate: new Date(conversationDate),
        medium,
        title,
        summary,
        transcript,
        duration,
        sourceType: sourceType || 'manual',
        sourceId,
        sourceUrl,
        privacyTier: privacyTier || 'INTERNAL',
        participants: {
          connect: participantIds
            ? participantIds.map((id: string) => ({ id }))
            : []
        },
        organizations: {
          connect: organizationIds
            ? organizationIds.map((id: string) => ({ id }))
            : []
        },
        deals: {
          connect: dealIds
            ? dealIds.map((id: string) => ({ id }))
            : []
        }
      },
      include: {
        organizations: {
          select: {
            id: true,
            name: true
          }
        },
        deals: {
          select: {
            id: true,
            name: true
          }
        },
        participants: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(
      {
        conversation
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
