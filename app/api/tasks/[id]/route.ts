/**
 * Task Detail API
 * GET - Get single task with full details
 * PATCH - Update task (including status changes)
 * DELETE - Delete task
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
            linkedInUrl: true,
            phone: true
          }
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
            organizationType: true,
            website: true
          }
        },
        deal: {
          select: {
            id: true,
            name: true,
            stage: true,
            dealType: true,
            organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        conversation: {
          select: {
            id: true,
            title: true,
            conversationDate: true,
            medium: true,
            summary: true
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Calculate metadata
    const isOverdue = task.dueDate && task.status !== 'DONE' && task.dueDate < new Date();
    const daysUntilDue = task.dueDate
      ? Math.ceil((task.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const response = {
      ...task,
      isOverdue,
      daysUntilDue
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const {
      title,
      description,
      status,
      priority,
      dueDate,
      assignedToId,
      organizationId,
      dealId,
      conversationId
    } = body;

    // Build update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      // If marking as done, set completedAt
      if (status === 'DONE') {
        updateData.completedAt = new Date();
      } else if (status !== 'DONE') {
        // If unmarking as done, clear completedAt
        updateData.completedAt = null;
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (organizationId !== undefined) updateData.organizationId = organizationId;
    if (dealId !== undefined) updateData.dealId = dealId;
    if (conversationId !== undefined) updateData.conversationId = conversationId;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        createdBy: {
          select: {
            id: true,
            fullName: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        deal: {
          select: {
            id: true,
            name: true,
            stage: true
          }
        },
        conversation: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.task.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
