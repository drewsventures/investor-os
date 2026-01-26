/**
 * Supabase Auth Client Configuration (Browser-only)
 * For use in client components
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton client for browser
let browserClient: SupabaseClient | null = null;

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Browser-side Supabase client (for client components)
 * Returns null if Supabase is not configured
 */
export function createBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: {
        flowType: 'pkce',
      },
    });
  }
  return browserClient;
}

// Allowed email domains for team registration
export const ALLOWED_DOMAINS = ['denariilabs.xyz', 'redbeard.ventures'];

/**
 * Check if an email is from an allowed domain
 */
export function isAllowedEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}
