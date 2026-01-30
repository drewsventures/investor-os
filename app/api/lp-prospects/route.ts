/**
 * LP Prospects API Route
 * GET: List LP prospects with filtering
 * POST: Create new LP prospect
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { LPStage } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const fundName = searchParams.get('fundName');
    const countsOnly = searchParams.get('countsOnly') === 'true';

    // Build where clause
    const where: {
      stage?: LPStage;
      fundName?: string;
    } = {};

    if (stage) {
      where.stage = stage as LPStage;
    }
    if (fundName) {
      where.fundName = fundName;
    }

    // If counts only, return summary stats
    if (countsOnly) {
      const total = await prisma.lPProspect.count({ where });
      return NextResponse.json({ total });
    }

    // Fetch prospects with relations
    const prospects = await prisma.lPProspect.findMany({
      where,
      include: {
        person: {
          select: {
            id: true,
            fullName: true,
            email: true,
            linkedInUrl: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            domain: true,
            logoUrl: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [
        { stage: 'asc' },
        { updatedAt: 'desc' },
      ],
    });

    // Calculate stats
    const stats = {
      total: prospects.length,
      byStage: {} as Record<string, number>,
      totalTargetAmount: 0,
      totalSoftCommit: 0,
      totalHardCommit: 0,
      totalFunded: 0,
    };

    for (const prospect of prospects) {
      // Count by stage
      stats.byStage[prospect.stage] = (stats.byStage[prospect.stage] || 0) + 1;

      // Sum target amounts
      const amount = prospect.targetAmount ? Number(prospect.targetAmount) : 0;
      stats.totalTargetAmount += amount;

      if (prospect.stage === 'SOFT_COMMIT') {
        stats.totalSoftCommit += amount;
      } else if (prospect.stage === 'HARD_COMMIT') {
        stats.totalHardCommit += amount;
      } else if (prospect.stage === 'FUNDED') {
        stats.totalFunded += amount;
      }
    }

    return NextResponse.json({ prospects, stats });
  } catch (error) {
    console.error('Failed to fetch LP prospects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LP prospects', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      personId,
      organizationId,
      stage = 'IDENTIFIED',
      targetAmount,
      probability,
      notes,
      fundName = 'Red Beard Ventures Fund II',
      nextFollowUp,
    } = body;

    // Validate that at least one of personId or organizationId is provided
    if (!personId && !organizationId) {
      return NextResponse.json(
        { error: 'Either personId or organizationId is required' },
        { status: 400 }
      );
    }

    // Check if prospect already exists for this person/org
    const existingProspect = await prisma.lPProspect.findFirst({
      where: {
        OR: [
          personId ? { personId } : {},
          organizationId ? { organizationId } : {},
        ].filter((c) => Object.keys(c).length > 0),
      },
    });

    if (existingProspect) {
      return NextResponse.json(
        { error: 'LP prospect already exists for this person/organization' },
        { status: 409 }
      );
    }

    // Create the prospect
    const prospect = await prisma.lPProspect.create({
      data: {
        personId: personId || undefined,
        organizationId: organizationId || undefined,
        stage: stage as LPStage,
        targetAmount: targetAmount ? parseFloat(targetAmount) : undefined,
        probability: probability ? parseInt(probability) : undefined,
        notes,
        fundName,
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : undefined,
        assignedToId: user.id,
      },
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

    // Create initial stage history entry
    await prisma.lPStageHistory.create({
      data: {
        prospectId: prospect.id,
        fromStage: null,
        toStage: stage as LPStage,
        changedById: user.id,
        notes: 'Initial creation',
      },
    });

    return NextResponse.json({ prospect }, { status: 201 });
  } catch (error) {
    console.error('Failed to create LP prospect:', error);
    return NextResponse.json(
      { error: 'Failed to create LP prospect', details: String(error) },
      { status: 500 }
    );
  }
}
