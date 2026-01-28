/**
 * People API
 * GET - List all people with filtering
 * POST - Create a new person (with automatic deduplication by email)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolveOrCreatePerson, type PersonInput } from '@/lib/normalization/entity-resolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const hasLPCommitment = searchParams.get('isLP') === 'true';

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const people = await prisma.person.findMany({
      where,
      include: {
        lpCommitments: hasLPCommitment ? true : false,
        emailLinks: {
          include: { email: { select: { sentAt: true } } }
        },
        conversations: {
          select: { conversationDate: true }
        },
        updates: {
          select: { updateDate: true }
        },
        _count: {
          select: {
            conversations: true,
            tasks: true,
            facts: true
          }
        }
      },
      orderBy: [
        { fullName: 'asc' }
      ]
    });

    // Calculate lastActivityAt for each person
    const peopleWithActivity = people.map(person => {
      const dates: Date[] = [];

      // Get all email dates
      person.emailLinks.forEach(link => {
        if (link.email?.sentAt) {
          dates.push(new Date(link.email.sentAt));
        }
      });

      // Get all conversation dates
      person.conversations.forEach(conv => {
        if (conv.conversationDate) {
          dates.push(new Date(conv.conversationDate));
        }
      });

      // Get all update dates
      person.updates.forEach(update => {
        if (update.updateDate) {
          dates.push(new Date(update.updateDate));
        }
      });

      const lastActivityAt = dates.length > 0
        ? new Date(Math.max(...dates.map(d => d.getTime())))
        : null;

      // Remove the included relations from the response
      const { emailLinks, conversations, updates, ...personData } = person;

      return {
        ...personData,
        lastActivityAt,
        conversationCount: person._count.conversations,
        taskCount: person._count.tasks,
      };
    });

    // Get relationships for each person (top organizations they're associated with)
    const peopleWithOrgs = await Promise.all(
      peopleWithActivity.map(async (person) => {
        const relationships = await prisma.relationship.findMany({
          where: {
            sourceType: 'Person',
            sourceId: person.id,
            targetType: 'Organization',
            isActive: true
          },
          orderBy: { strength: 'desc' },
          take: 3 // Top 3 organizations
        });

        const orgIds = relationships.map(r => r.targetId);
        const orgs = orgIds.length > 0
          ? await prisma.organization.findMany({
              where: { id: { in: orgIds } },
              select: {
                id: true,
                name: true,
                organizationType: true,
                industry: true
              }
            })
          : [];

        const orgsWithRoles = orgs.map(o => {
          const rel = relationships.find(r => r.targetId === o.id);
          return {
            ...o,
            role: (rel?.properties as any)?.role || 'Unknown',
            relationshipType: rel?.relationshipType
          };
        });

        return {
          ...person,
          organizations: orgsWithRoles
        };
      })
    );

    // Summary
    const totalLPs = peopleWithActivity.filter(p => p.lpCommitments && p.lpCommitments.length > 0).length;
    const totalContactedLast30Days = peopleWithActivity.filter(p => {
      if (!p.lastActivityAt) return false;
      const daysSince = Math.floor(
        (Date.now() - p.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSince <= 30;
    }).length;

    const summary = {
      totalPeople: peopleWithActivity.length,
      totalLPs,
      contactedLast30Days: totalContactedLast30Days,
      withEmail: peopleWithActivity.filter(p => p.email).length
    };

    return NextResponse.json({ people: peopleWithOrgs, summary });
  } catch (error) {
    console.error('Failed to fetch people:', error);
    return NextResponse.json(
      { error: 'Failed to fetch people' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      linkedInUrl,
      twitterHandle,
      phone,
      privacyTier
    } = body;

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    const input: PersonInput = {
      firstName,
      lastName,
      email,
      linkedInUrl,
      twitterHandle,
      phone,
      privacyTier: privacyTier || 'INTERNAL'
    };

    // Use entity resolver for automatic deduplication by email
    const result = await resolveOrCreatePerson(input, true);

    return NextResponse.json({
      person: result.person,
      isNew: result.isNew,
      wasUpdated: result.wasUpdated
    }, { status: result.isNew ? 201 : 200 });
  } catch (error) {
    console.error('Failed to create/update person:', error);
    return NextResponse.json(
      { error: 'Failed to create/update person' },
      { status: 500 }
    );
  }
}
