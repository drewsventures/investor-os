/**
 * Auth Middleware for API Routes
 * Higher-order functions to protect API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, type SessionUser } from './session';

export type AuthenticatedHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
  user: SessionUser
) => Promise<NextResponse>;

/**
 * Protect a route - requires authentication
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await getSession();

      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      return handler(request, context, user);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

/**
 * Protect a route - requires Owner role
 */
export function withOwner(handler: AuthenticatedHandler) {
  return withAuth(async (request, context, user) => {
    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Forbidden: Owner access required' },
        { status: 403 }
      );
    }
    return handler(request, context, user);
  });
}

/**
 * Protect a route - requires Admin or Owner role
 */
export function withAdmin(handler: AuthenticatedHandler) {
  return withAuth(async (request, context, user) => {
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    return handler(request, context, user);
  });
}

/**
 * Optional auth - passes user if authenticated, null otherwise
 */
export type OptionalAuthHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
  user: SessionUser | null
) => Promise<NextResponse>;

export function withOptionalAuth(handler: OptionalAuthHandler) {
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await getSession();
      return handler(request, context, user);
    } catch (error) {
      console.error('Optional auth error:', error);
      return handler(request, context, null);
    }
  };
}
