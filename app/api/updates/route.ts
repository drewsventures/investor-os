/**
 * Updates API Route
 * GET: List updates with filters
 * POST: Create a new update (note, news, investor update, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { UpdateType } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET: List updates with filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const personId = searchParams.get('personId');
    const organizationId = searchParams.get('organizationId');
    const dealId = searchParams.get('dealId');
    const type = searchParams.get('type') as UpdateType | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where clause
    const where: {
      personId?: string;
      organizationId?: string;
      dealId?: string;
      type?: UpdateType;
    } = {};

    if (personId) where.personId = personId;
    if (organizationId) where.organizationId = organizationId;
    if (dealId) where.dealId = dealId;
    if (type && Object.values(UpdateType).includes(type)) {
      where.type = type;
    }

    const [updates, total] = await Promise.all([
      prisma.update.findMany({
        where,
        orderBy: { updateDate: 'desc' },
        take: limit,
        skip: offset,
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
      }),
      prisma.update.count({ where }),
    ]);

    return NextResponse.json({
      updates,
      total,
      hasMore: offset + updates.length < total,
    });
  } catch (error) {
    console.error('Updates list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch updates' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new update
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type = 'NOTE',
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

    // Validate type
    if (!Object.values(UpdateType).includes(type)) {
      return NextResponse.json(
        { error: `Invalid update type: ${type}` },
        { status: 400 }
      );
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // At least one entity must be linked
    if (!personId && !organizationId && !dealId) {
      return NextResponse.json(
        { error: 'Update must be linked to at least one entity (person, organization, or deal)' },
        { status: 400 }
      );
    }

    // Verify entities exist
    if (personId) {
      const person = await prisma.person.findUnique({ where: { id: personId } });
      if (!person) {
        return NextResponse.json({ error: 'Person not found' }, { status: 404 });
      }
    }

    if (organizationId) {
      const org = await prisma.organization.findUnique({ where: { id: organizationId } });
      if (!org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }
    }

    if (dealId) {
      const deal = await prisma.deal.findUnique({ where: { id: dealId } });
      if (!deal) {
        return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
      }
    }

    // Create update
    const update = await prisma.update.create({
      data: {
        type,
        title,
        content,
        updateDate: updateDate ? new Date(updateDate) : new Date(),
        sourceUrl,
        sourceAuthor,
        sourceName,
        personId,
        organizationId,
        dealId,
        authorId: user.id,
        metadata: metadata || undefined,
      },
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

    return NextResponse.json({ update }, { status: 201 });
  } catch (error) {
    console.error('Create update error:', error);
    return NextResponse.json(
      { error: 'Failed to create update' },
      { status: 500 }
    );
  }
}
