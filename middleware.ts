/**
 * Next.js Middleware
 * Protects routes by checking authentication state via Supabase
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/callback', '/api/auth/signout'];

// Routes that are always public (API routes, static files, etc.)
const alwaysPublicPrefixes = ['/_next', '/favicon.ico', '/api/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for always-public routes
  if (alwaysPublicPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Skip middleware for public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Create response to modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not authenticated, redirect to login
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check domain restriction
  const email = user.email;
  if (email) {
    const domain = email.split('@')[1]?.toLowerCase();
    const allowedDomains = ['denariilabs.xyz', 'redbeard.ventures'];

    if (!allowedDomains.includes(domain)) {
      // Sign out and redirect to login with error
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set(
        'error',
        'Access restricted to @denariilabs.xyz and @redbeard.ventures emails'
      );
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
