/**
 * Tasks API
 * GET - List tasks with filtering
 * POST - Create a new task
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // TODO, IN_PROGRESS, BLOCKED, DONE
    const priority = searchParams.get('priority'); // LOW, MEDIUM, HIGH, URGENT
    const assignedToId = searchParams.get('assignedToId');
    const organizationId = searchParams.get('organizationId');
    const dealId = searchParams.get('dealId');
    const conversationId = searchParams.get('conversationId');
    const overdue = searchParams.get('overdue') === 'true';
    const upcoming = searchParams.get('upcoming'); // Days ahead
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build where clause
    const where: any = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedToId) where.assignedToId = assignedToId;
    if (organizationId) where.organizationId = organizationId;
    if (dealId) where.dealId = dealId;
    if (conversationId) where.conversationId = conversationId;

    // Overdue tasks
    if (overdue) {
      where.dueDate = { lt: new Date() };
      where.status = { not: 'DONE' };
    }

    // Upcoming tasks
    if (upcoming) {
      const daysAhead = parseInt(upcoming);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      where.dueDate = { lte: futureDate, gte: new Date() };
      where.status = { not: 'DONE' };
    }

    const tasks = await prisma.task.findMany({
      where,
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
        conversation: {
          select: {
            id: true,
            title: true,
            conversationDate: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ],
      take: limit
    });

    // Calculate if overdue
    const formattedTasks = tasks.map(task => ({
      ...task,
      isOverdue: task.dueDate && task.status !== 'DONE' && task.dueDate < new Date(),
      daysUntilDue: task.dueDate
        ? Math.ceil((task.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null
    }));

    // Summary stats
    const summary = {
      totalTasks: formattedTasks.length,
      byStatus: formattedTasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPriority: formattedTasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      overdueTasks: formattedTasks.filter(t => t.isOverdue).length,
      dueSoon: formattedTasks.filter(t =>
        t.daysUntilDue !== null &&
        t.daysUntilDue >= 0 &&
        t.daysUntilDue <= 7 &&
        t.status !== 'DONE'
      ).length
    };

    return NextResponse.json({
      tasks: formattedTasks,
      summary
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      assignedToId,
      createdById,
      organizationId,
      dealId,
      conversationId,
      sourceOfTruth,
      sourceId
    } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      );
    }

    // Validate enums
    const validStatuses = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` },
        { status: 400 }
      );
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedToId,
        createdById,
        organizationId,
        dealId,
        conversationId,
        sourceOfTruth: sourceOfTruth || 'manual',
        sourceId
      },
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

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
