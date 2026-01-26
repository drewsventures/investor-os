/**
 * Session Helpers
 * Get and validate user sessions from Supabase Auth
 */

import { createServerClient } from './supabase-server';
import { prisma } from '@/lib/db';
import type { TeamRole } from '@prisma/client';

export interface SessionUser {
  id: string;
  supabaseUserId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: TeamRole;
  teamId: string;
  defaultVisibility: string;
  personId: string | null;
}

/**
 * Get the current session user from Supabase Auth and our database
 * Returns null if not authenticated
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const supabase = await createServerClient();
    if (!supabase) {
      return null;
    }

    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return null;
    }

    // Fetch user from our database
    const user = await prisma.user.findUnique({
      where: { supabaseUserId: supabaseUser.id },
      select: {
        id: true,
        supabaseUserId: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        teamId: true,
        defaultVisibility: true,
        personId: true,
      },
    });

    if (!user) {
      // User exists in Supabase but not in our database
      // This can happen if user was just created - they need to complete signup
      return null;
    }

    // Update last active time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    return user as SessionUser;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

/**
 * Check if user has Owner role
 */
export function isOwner(user: SessionUser): boolean {
  return user.role === 'OWNER';
}

/**
 * Check if user has Admin or Owner role
 */
export function isAdmin(user: SessionUser): boolean {
  return user.role === 'OWNER' || user.role === 'ADMIN';
}

/**
 * Sync Supabase user to our database (called on first login/signup)
 */
export async function syncUserToDatabase(supabaseUser: {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}): Promise<SessionUser | null> {
  if (!supabaseUser.email) {
    console.error('Cannot sync user without email');
    return null;
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { supabaseUserId: supabaseUser.id },
  });

  if (existingUser) {
    // Update avatar if changed
    if (supabaseUser.user_metadata?.avatar_url !== existingUser.avatarUrl) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { avatarUrl: supabaseUser.user_metadata?.avatar_url },
      });
    }
    return existingUser as SessionUser;
  }

  // Get or create team
  let team = await prisma.team.findUnique({
    where: { slug: 'red-beard-ventures' },
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: 'Red Beard Ventures',
        slug: 'red-beard-ventures',
        allowedDomains: ['denariilabs.xyz', 'redbeard.ventures'],
        defaultVisibility: 'PRIVATE',
      },
    });
  }

  // Determine role - first user or specific email becomes OWNER
  const existingUsers = await prisma.user.count({
    where: { teamId: team.id },
  });

  const isFirstUser = existingUsers === 0;
  const role: TeamRole = isFirstUser ? 'OWNER' : 'MEMBER';

  // Create new user
  const newUser = await prisma.user.create({
    data: {
      supabaseUserId: supabaseUser.id,
      email: supabaseUser.email,
      fullName: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
      avatarUrl: supabaseUser.user_metadata?.avatar_url,
      teamId: team.id,
      role,
      defaultVisibility: 'PRIVATE',
    },
  });

  console.log(`Created new user: ${newUser.email} with role: ${role}`);

  return newUser as SessionUser;
}
