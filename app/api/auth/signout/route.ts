/**
 * Sign Out Route
 * Signs the user out of Supabase Auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/auth/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    if (supabase) {
      await supabase.auth.signOut();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: 'Failed to sign out' },
      { status: 500 }
    );
  }
}

// Also support GET for easy redirect-based logout
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);

  try {
    const supabase = await createServerClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch (error) {
    console.error('Sign out error:', error);
  }

  return NextResponse.redirect(`${origin}/login`);
}
