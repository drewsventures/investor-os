/**
 * Single Update API Route
 * GET: Get update by ID
 * PATCH: Update an update
 * DELETE: Delete an update
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { UpdateType } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET: Get single update by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const update = await prisma.update.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        person: {
          select: {
            id: true,
            fullName: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        deal: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!update) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    return NextResponse.json({ update });
  } catch (error) {
    console.error('Get update error:', error);
    return NextResponse.json(
      { error: 'Failed to get update' },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update an update
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if update exists and user is author
    const existing = await prisma.update.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    // Only author or admin can edit
    if (existing.authorId !== user.id && user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You can only edit your own updates' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      type,
      title,
      content,
      updateDate,
      sourceUrl,
      sourceAuthor,
      sourceName,
      personId,
      organizationId,
      dealId,
      metadata,
    } = body;

    // Validate type if provided
    if (type && !Object.values(UpdateType).includes(type)) {
      return NextResponse.json(
        { error: `Invalid update type: ${type}` },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: {
      type?: UpdateType;
      title?: string | null;
      content?: string;
      updateDate?: Date;
      sourceUrl?: string | null;
      sourceAuthor?: string | null;
      sourceName?: string | null;
      personId?: string | null;
      organizationId?: string | null;
      dealId?: string | null;
      metadata?: object;
    } = {};

    if (type !== undefined) updateData.type = type;
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (updateDate !== undefined) updateData.updateDate = new Date(updateDate);
    if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl;
    if (sourceAuthor !== undefined) updateData.sourceAuthor = sourceAuthor;
    if (sourceName !== undefined) updateData.sourceName = sourceName;
    if (personId !== undefined) updateData.personId = personId;
    if (organizationId !== undefined) updateData.organizationId = organizationId;
    if (dealId !== undefined) updateData.dealId = dealId;
    if (metadata !== undefined) updateData.metadata = metadata;

    const update = await prisma.update.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        person: {
          select: {
            id: true,
            fullName: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        deal: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ update });
  } catch (error) {
    console.error('Update update error:', error);
    return NextResponse.json(
      { error: 'Failed to update' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete an update
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if update exists and user is author
    const existing = await prisma.update.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    // Only author or admin can delete
    if (existing.authorId !== user.id && user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You can only delete your own updates' },
        { status: 403 }
      );
    }

    await prisma.update.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete update error:', error);
    return NextResponse.json(
      { error: 'Failed to delete update' },
      { status: 500 }
    );
  }
}
