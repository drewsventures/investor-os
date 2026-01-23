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
          organization: {
            select: {
              id: true,
              name: true,
              organizationType: true
            }
          },
          deal: {
            select: {
              id: true,
              name: true,
              stage: true
            }
          },
          participants: {
            include: {
              person: {
                select: {
                  id: true,
                  fullName: true,
                  email: true
                }
              }
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
          organization: {
            select: {
              id: true,
              name: true,
              organizationType: true
            }
          },
          deal: {
            select: {
              id: true,
              name: true,
              stage: true
            }
          },
          participants: {
            include: {
              person: {
                select: {
                  id: true,
                  fullName: true,
                  email: true
                }
              }
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
      sentiment: conv.sentiment,
      organizationId: conv.organizationId,
      organization: conv.organization,
      dealId: conv.dealId,
      deal: conv.deal,
      participants: conv.participants.map(p => ({
        id: p.person.id,
        fullName: p.person.fullName,
        email: p.person.email,
        role: p.role
      })),
      factCount: conv._count.facts,
      taskCount: conv._count.tasks,
      sourceOfTruth: conv.sourceOfTruth,
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
      sentiment,
      organizationId,
      dealId,
      participantIds, // Array of person IDs
      participantsWithRoles, // Array of { personId, role }
      sourceOfTruth,
      sourceId,
      privacyTier,
      location,
      recordingUrl
    } = body;

    // Validate required fields
    if (!conversationDate || !medium || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: conversationDate, medium, title' },
        { status: 400 }
      );
    }

    // Validate medium enum
    const validMediums = ['CALL', 'EMAIL', 'MEETING', 'VIDEO_CALL', 'MESSAGE', 'OTHER'];
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
        sentiment,
        organizationId,
        dealId,
        sourceOfTruth: sourceOfTruth || 'manual',
        sourceId,
        privacyTier: privacyTier || 'INTERNAL',
        location,
        recordingUrl,
        participants: {
          create: participantsWithRoles
            ? participantsWithRoles.map((p: any) => ({
                personId: p.personId,
                role: p.role
              }))
            : participantIds
            ? participantIds.map((personId: string) => ({
                personId,
                role: 'PARTICIPANT'
              }))
            : []
        }
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        deal: {
          select: {
            id: true,
            name: true
          }
        },
        participants: {
          include: {
            person: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(
      {
        conversation: {
          ...conversation,
          participants: conversation.participants.map(p => ({
            id: p.person.id,
            fullName: p.person.fullName,
            email: p.person.email,
            role: p.role
          }))
        }
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
