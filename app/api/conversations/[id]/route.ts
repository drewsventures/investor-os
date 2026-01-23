/**
 * Conversation Detail API
 * GET - Get single conversation with full details
 * PATCH - Update conversation
 * DELETE - Delete conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await segmentData.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            organizationType: true,
            website: true
          }
        },
        deals: {
          select: {
            id: true,
            name: true,
            stage: true,
            dealType: true
          }
        },
        participants: {
          select: {
            id: true,
            fullName: true,
            email: true,
            linkedInUrl: true,
            phone: true
          }
        },
        facts: {
          where: { validUntil: null },
          orderBy: { validFrom: 'desc' }
        },
        tasks: {
          where: {
            status: { not: 'DONE' }
          },
          orderBy: [
            { priority: 'desc' },
            { dueDate: 'asc' }
          ],
          include: {
            assignedToPerson: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        }
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Format facts by type
    const factsByType: Record<string, any[]> = {};
    conversation.facts.forEach(fact => {
      if (!factsByType[fact.factType]) {
        factsByType[fact.factType] = [];
      }
      factsByType[fact.factType].push({
        id: fact.id,
        key: fact.key,
        value: fact.value,
        sourceType: fact.sourceType,
        confidence: Number(fact.confidence),
        validFrom: fact.validFrom,
        createdAt: fact.createdAt
      });
    });

    const response = {
      ...conversation,
      participants: conversation.participants.map(p => ({
        id: p.id,
        fullName: p.fullName,
        email: p.email,
        linkedInUrl: p.linkedInUrl,
        phone: p.phone
      })),
      factsByType,
      tasks: conversation.tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        assignedToPerson: t.assignedToPerson ? {
          id: t.assignedToPerson.id,
          fullName: t.assignedToPerson.fullName
        } : null
      }))
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await segmentData.params;
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
      privacyTier,
      location,
      recordingUrl
    } = body;

    // Build update data
    const updateData: any = {};
    if (conversationDate !== undefined) updateData.conversationDate = new Date(conversationDate);
    if (medium !== undefined) updateData.medium = medium;
    if (title !== undefined) updateData.title = title;
    if (summary !== undefined) updateData.summary = summary;
    if (transcript !== undefined) updateData.transcript = transcript;
    if (duration !== undefined) updateData.duration = duration;
    if (sentiment !== undefined) updateData.sentiment = sentiment;
    if (organizationId !== undefined) updateData.organizationId = organizationId;
    if (dealId !== undefined) updateData.dealId = dealId;
    if (privacyTier !== undefined) updateData.privacyTier = privacyTier;
    if (location !== undefined) updateData.location = location;
    if (recordingUrl !== undefined) updateData.recordingUrl = recordingUrl;

    const conversation = await prisma.conversation.update({
      where: { id },
      data: updateData,
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
        },
        _count: {
          select: {
            facts: true,
            tasks: true
          }
        }
      }
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Failed to update conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await segmentData.params;

    await prisma.conversation.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
