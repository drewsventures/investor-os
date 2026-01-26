/**
 * Auth Callback Route
 * Handles OAuth redirects and email confirmation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isAllowedEmail } from '@/lib/auth/supabase-server';
import { syncUserToDatabase } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth/magic link errors
  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('No authorization code provided')}`
    );
  }

  try {
    const supabase = await createServerClient();

    if (!supabase) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Authentication not configured')}`
      );
    }

    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    if (!data.user || !data.user.email) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('No user data received')}`
      );
    }

    // Check domain restriction
    if (!isAllowedEmail(data.user.email)) {
      // Sign out the user since they're not allowed
      await supabase.auth.signOut();
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Access restricted to @denariilabs.xyz and @redbeard.ventures emails')}`
      );
    }

    // Sync user to our database
    const user = await syncUserToDatabase({
      id: data.user.id,
      email: data.user.email,
      user_metadata: {
        full_name: data.user.user_metadata?.full_name,
        avatar_url: data.user.user_metadata?.avatar_url,
      },
    });

    if (!user) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Failed to create user account')}`
      );
    }

    // Successful authentication
    return NextResponse.redirect(`${origin}${next}`);
  } catch (error) {
    console.error('Auth callback exception:', error);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Authentication failed')}`
    );
  }
}
