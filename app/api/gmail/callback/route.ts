/**
 * Gmail OAuth Callback Route
 * Handles OAuth callback and stores tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GmailClient, getGmailConfig } from '@/lib/gmail/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth error
    if (error) {
      return NextResponse.redirect(
        new URL(
          `/settings/integrations?error=${encodeURIComponent(error)}`,
          request.url
        )
      );
    }

    // Validate required parameters
    if (!code) {
      return NextResponse.redirect(
        new URL(
          '/settings/integrations?error=No authorization code received',
          request.url
        )
      );
    }

    // Verify state (optional but recommended)
    const storedState = request.cookies.get('gmail_oauth_state')?.value;
    if (state && storedState && state !== storedState) {
      return NextResponse.redirect(
        new URL(
          '/settings/integrations?error=Invalid state parameter',
          request.url
        )
      );
    }

    // Exchange code for tokens
    const config = getGmailConfig();
    const tokens = await GmailClient.exchangeCodeForTokens(config, code);

    // Check if connection already exists for this email
    const existingConnection = await prisma.gmailConnection.findUnique({
      where: { email: tokens.email },
    });

    if (existingConnection) {
      // Update existing connection
      await prisma.gmailConnection.update({
        where: { id: existingConnection.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
        },
      });
    } else {
      // Create new connection
      await prisma.gmailConnection.create({
        data: {
          email: tokens.email,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
        },
      });
    }

    // Clear state cookie and redirect to settings with success
    const response = NextResponse.redirect(
      new URL('/settings/integrations?gmail=connected', request.url)
    );
    response.cookies.delete('gmail_oauth_state');

    return response;
  } catch (error) {
    console.error('Gmail callback error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to complete OAuth';
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=${encodeURIComponent(errorMessage)}`,
        request.url
      )
    );
  }
}
