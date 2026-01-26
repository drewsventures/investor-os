/**
 * Fireflies Connect Route
 * POST: Save API key and verify connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { FirefliesClient } from '@/lib/fireflies/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Verify API key with Fireflies
    const client = new FirefliesClient({ apiKey });
    let firefliesUser;
    try {
      firefliesUser = await client.verifyApiKey();
    } catch (error) {
      console.error('Fireflies API key verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid API key. Please check your Fireflies API key.' },
        { status: 400 }
      );
    }

    // Check if connection already exists for this user
    const existingConnection = await prisma.firefliesConnection.findFirst({
      where: { ownerUserId: user.id },
    });

    if (existingConnection) {
      // Update existing connection
      await prisma.firefliesConnection.update({
        where: { id: existingConnection.id },
        data: {
          apiKey,
          email: firefliesUser.email,
          firefliesUserId: firefliesUser.user_id,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Fireflies connection updated',
        connection: {
          email: firefliesUser.email,
          name: firefliesUser.name,
          minutesConsumed: firefliesUser.minutes_consumed,
        },
      });
    }

    // Create new connection
    await prisma.firefliesConnection.create({
      data: {
        apiKey,
        email: firefliesUser.email,
        firefliesUserId: firefliesUser.user_id,
        ownerUserId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Fireflies connected successfully',
      connection: {
        email: firefliesUser.email,
        name: firefliesUser.name,
        minutesConsumed: firefliesUser.minutes_consumed,
      },
    });
  } catch (error) {
    console.error('Fireflies connect error:', error);
    return NextResponse.json(
      { error: 'Failed to connect Fireflies' },
      { status: 500 }
    );
  }
}
