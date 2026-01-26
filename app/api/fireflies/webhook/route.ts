/**
 * Fireflies Webhook Route
 * POST: Handle incoming webhooks from Fireflies
 *
 * Fireflies sends webhooks when:
 * - transcription_complete: A new transcript is ready
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncSingleTranscript } from '@/lib/fireflies/sync-service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

interface FirefliesWebhookPayload {
  event_type: 'transcription_complete';
  transcript_id: string;
  title?: string;
  meeting_date?: string;
  user_id?: string;
}

/**
 * Verify webhook signature (if secret is configured)
 */
function verifySignature(
  payload: string,
  signature: string | null,
  secret: string | null
): boolean {
  if (!secret) {
    // No secret configured, skip verification
    return true;
  }

  if (!signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-fireflies-signature');

    let payload: FirefliesWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Log webhook for debugging
    console.log('Fireflies webhook received:', {
      event: payload.event_type,
      transcriptId: payload.transcript_id,
      title: payload.title,
    });

    // Only handle transcription_complete events
    if (payload.event_type !== 'transcription_complete') {
      return NextResponse.json({ status: 'ignored', reason: 'unknown event type' });
    }

    if (!payload.transcript_id) {
      return NextResponse.json(
        { error: 'Missing transcript_id' },
        { status: 400 }
      );
    }

    // Find the connection by Fireflies user ID if available
    // Otherwise, try all connections (for now, we'll process for all)
    const connections = await prisma.firefliesConnection.findMany({
      where: payload.user_id
        ? { firefliesUserId: payload.user_id }
        : { webhookEnabled: true },
      select: {
        id: true,
        webhookSecret: true,
      },
    });

    if (connections.length === 0) {
      console.log('No matching Fireflies connections found for webhook');
      return NextResponse.json({ status: 'no_connection' });
    }

    // Process for each matching connection
    const results: Array<{ connectionId: string; success: boolean; error?: string }> = [];

    for (const connection of connections) {
      // Verify signature if secret is configured
      if (!verifySignature(rawBody, signature, connection.webhookSecret)) {
        results.push({
          connectionId: connection.id,
          success: false,
          error: 'Invalid signature',
        });
        continue;
      }

      // Sync the single transcript
      const result = await syncSingleTranscript(connection.id, payload.transcript_id);
      results.push({
        connectionId: connection.id,
        success: result.success,
        error: result.error,
      });
    }

    return NextResponse.json({
      status: 'processed',
      results,
    });
  } catch (error) {
    console.error('Fireflies webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * GET: Webhook verification endpoint (some services require this)
 */
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge');

  if (challenge) {
    // Return challenge for webhook verification
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({ status: 'Fireflies webhook endpoint active' });
}
