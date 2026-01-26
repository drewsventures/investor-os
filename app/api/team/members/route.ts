/**
 * Team Members API Route
 * List and manage team members
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

// GET - List team members
export async function GET() {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only Owner and Admin can view team members
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const members = await prisma.user.findMany({
      where: { teamId: user.teamId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        lastActiveAt: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' }, // OWNER first, then ADMIN, then MEMBER
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Team members fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

// PUT - Update member role
export async function PUT(request: NextRequest) {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only Owner can change roles
    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only the owner can change roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId || !role) {
      return NextResponse.json(
        { error: 'memberId and role are required' },
        { status: 400 }
      );
    }

    if (!['ADMIN', 'MEMBER'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be ADMIN or MEMBER' },
        { status: 400 }
      );
    }

    // Verify member exists and is in same team
    const member = await prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member || member.teamId !== user.teamId) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Cannot change owner role
    if (member.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot change owner role' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: memberId },
      data: { role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Role update error:', error);
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    );
  }
}

// DELETE - Remove member
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only Owner can remove members
    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only the owner can remove members' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    // Verify member exists and is in same team
    const member = await prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member || member.teamId !== user.teamId) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Cannot remove owner
    if (member.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot remove owner' },
        { status: 400 }
      );
    }

    // Cannot remove self
    if (member.id === user.id) {
      return NextResponse.json(
        { error: 'Cannot remove yourself' },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Member removal error:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
