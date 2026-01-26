/**
 * Gmail OAuth Connect Route
 * Redirects user to Google OAuth consent screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { GmailClient, getGmailConfig } from '@/lib/gmail/client';

export async function GET(request: NextRequest) {
  try {
    const config = getGmailConfig();

    // Generate a state parameter for security
    const state = crypto.randomUUID();

    // Store state in a cookie for verification on callback
    const authUrl = GmailClient.getAuthUrl(config, state);

    const response = NextResponse.redirect(authUrl);

    // Set state cookie (expires in 10 minutes)
    response.cookies.set('gmail_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Gmail connect error:', error);

    // Redirect to settings with error
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to initiate OAuth';
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=${encodeURIComponent(errorMessage)}`,
        request.url
      )
    );
  }
}
