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
        _count: {
          select: {
            conversations: true,
            tasks: true,
            facts: true
          }
        }
      },
      orderBy: [
        { lastContactedAt: 'desc' },
        { fullName: 'asc' }
      ]
    });

    // Get relationships for each person (top organizations they're associated with)
    const peopleWithOrgs = await Promise.all(
      people.map(async (person) => {
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
    const totalLPs = people.filter(p => p.lpCommitments && p.lpCommitments.length > 0).length;
    const totalContactedLast30Days = people.filter(p => {
      if (!p.lastContactedAt) return false;
      const daysSince = Math.floor(
        (Date.now() - p.lastContactedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSince <= 30;
    }).length;

    const summary = {
      totalPeople: people.length,
      totalLPs,
      contactedLast30Days: totalContactedLast30Days,
      withEmail: people.filter(p => p.email).length
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
