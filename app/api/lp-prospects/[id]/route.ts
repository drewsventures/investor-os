/**
 * Single LP Prospect API Route
 * GET: Get prospect details
 * PATCH: Update prospect (including stage changes)
 * DELETE: Remove prospect
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { LPStage } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const prospect = await prisma.lPProspect.findUnique({
      where: { id },
      include: {
        person: {
          select: {
            id: true,
            fullName: true,
            email: true,
            linkedInUrl: true,
            phone: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            domain: true,
            website: true,
            logoUrl: true,
            description: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        stageHistory: {
          orderBy: { changedAt: 'desc' },
          take: 10,
          include: {
            changedBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'LP prospect not found' }, { status: 404 });
    }

    return NextResponse.json({ prospect });
  } catch (error) {
    console.error('Failed to fetch LP prospect:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LP prospect', details: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      stage,
      targetAmount,
      probability,
      notes,
      nextFollowUp,
      lastContactedAt,
      assignedToId,
      stageChangeNotes,
    } = body;

    // Get current prospect to check for stage change
    const currentProspect = await prisma.lPProspect.findUnique({
      where: { id },
    });

    if (!currentProspect) {
      return NextResponse.json({ error: 'LP prospect not found' }, { status: 404 });
    }

    // Build update data
    const updateData: {
      stage?: LPStage;
      targetAmount?: number;
      probability?: number;
      notes?: string;
      nextFollowUp?: Date | null;
      lastContactedAt?: Date;
      assignedToId?: string;
    } = {};

    if (stage !== undefined) {
      updateData.stage = stage as LPStage;
    }
    if (targetAmount !== undefined) {
      updateData.targetAmount = parseFloat(targetAmount);
    }
    if (probability !== undefined) {
      updateData.probability = parseInt(probability);
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    if (nextFollowUp !== undefined) {
      updateData.nextFollowUp = nextFollowUp ? new Date(nextFollowUp) : null;
    }
    if (lastContactedAt !== undefined) {
      updateData.lastContactedAt = new Date(lastContactedAt);
    }
    if (assignedToId !== undefined) {
      updateData.assignedToId = assignedToId;
    }

    // Update the prospect
    const prospect = await prisma.lPProspect.update({
      where: { id },
      data: updateData,
      include: {
        person: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
      },
    });

    // Create stage history if stage changed
    if (stage !== undefined && stage !== currentProspect.stage) {
      await prisma.lPStageHistory.create({
        data: {
          prospectId: id,
          fromStage: currentProspect.stage,
          toStage: stage as LPStage,
          changedById: user.id,
          notes: stageChangeNotes || null,
        },
      });
    }

    return NextResponse.json({ prospect });
  } catch (error) {
    console.error('Failed to update LP prospect:', error);
    return NextResponse.json(
      { error: 'Failed to update LP prospect', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if prospect exists
    const prospect = await prisma.lPProspect.findUnique({
      where: { id },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'LP prospect not found' }, { status: 404 });
    }

    // Delete the prospect (cascade will delete stage history)
    await prisma.lPProspect.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete LP prospect:', error);
    return NextResponse.json(
      { error: 'Failed to delete LP prospect', details: String(error) },
      { status: 500 }
    );
  }
}
