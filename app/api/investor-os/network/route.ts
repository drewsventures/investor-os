import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Network API - Get team network contacts with filtering
 * GET /api/investor-os/network
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const teamMemberId = searchParams.get('teamMemberId');
    const country = searchParams.get('country');
    const city = searchParams.get('city');
    const region = searchParams.get('region');
    const hasEmail = searchParams.get('email') === 'true';
    const hasTelegram = searchParams.get('telegram') === 'true';
    const hasTwitter = searchParams.get('twitter') === 'true';
    const minStrength = searchParams.get('minStrength');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {
      privacyTier: {
        not: 'HIGHLY_SENSITIVE' // Filter out highly sensitive contacts by default
      }
    };

    // Geography filters
    if (country) where.country = country;
    if (city) where.city = city;
    if (region) where.region = region;

    // Contact method filters
    if (hasEmail) where.email = { not: null };
    if (hasTelegram) where.telegramHandle = { not: null };
    if (hasTwitter) where.twitterHandle = { not: null };

    // Team member filter (owner)
    if (teamMemberId) where.currentOwner = teamMemberId;

    // Text search
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Fetch people with relationships
    const people = await prisma.person.findMany({
      where,
      include: {
        conversations: {
          select: { id: true }
        },
        tasks: {
          select: { id: true }
        }
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    // For each person, get their organizations via Relationship model
    const peopleWithOrgs = await Promise.all(
      people.map(async (person) => {
        const orgRelationships = await prisma.relationship.findMany({
          where: {
            sourceType: 'Person',
            sourceId: person.id,
            targetType: 'Organization',
            relationshipType: { in: ['WORKS_AT', 'FOUNDED', 'INVESTED_IN'] },
            isActive: true
          },
          take: 3
        });

        const organizations = await Promise.all(
          orgRelationships.map(async (rel) => {
            const org = await prisma.organization.findUnique({
              where: { id: rel.targetId },
              select: {
                id: true,
                name: true,
                organizationType: true
              }
            });
            return org;
          })
        );

        // Get relationship strength (find any relationship involving this person)
        const relationship = await prisma.relationship.findFirst({
          where: {
            OR: [
              { sourceType: 'Person', sourceId: person.id },
              { targetType: 'Person', targetId: person.id }
            ],
            isActive: true
          },
          orderBy: {
            strength: 'desc' // Get the strongest relationship
          }
        });

        return {
          ...person,
          organizations: organizations.filter(org => org !== null),
          conversationCount: person.conversations.length,
          taskCount: person.tasks.length,
          relationshipStrength: relationship?.strength ? parseFloat(relationship.strength.toString()) : null
        };
      })
    );

    // Apply relationship strength filter if specified
    let filteredPeople = peopleWithOrgs;
    if (minStrength) {
      const minStrengthValue = parseFloat(minStrength);
      filteredPeople = peopleWithOrgs.filter(person =>
        person.relationshipStrength !== null && person.relationshipStrength >= minStrengthValue
      );
    }

    // Calculate summary statistics
    const totalContacts = filteredPeople.length;

    // Geography breakdown
    const geographyMap = new Map<string, number>();
    filteredPeople.forEach(person => {
      const country = (person as any).country;
      if (country) {
        const count = geographyMap.get(country) || 0;
        geographyMap.set(country, count + 1);
      }
    });
    const byGeography = Array.from(geographyMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Owner breakdown
    const ownerMap = new Map<string, { ownerId: string; ownerName: string; count: number }>();
    await Promise.all(
      filteredPeople
        .filter(person => (person as any).currentOwner)
        .map(async (person) => {
          const ownerId = (person as any).currentOwner!;
          if (!ownerMap.has(ownerId)) {
            const owner = await prisma.person.findUnique({
              where: { id: ownerId },
              select: { fullName: true }
            });
            ownerMap.set(ownerId, {
              ownerId,
              ownerName: owner?.fullName || 'Unknown',
              count: 0
            });
          }
          const entry = ownerMap.get(ownerId)!;
          entry.count += 1;
        })
    );
    const byOwner = Array.from(ownerMap.values()).sort((a, b) => b.count - a.count);

    // Average relationship strength
    const contactsWithStrength = filteredPeople.filter(p => p.relationshipStrength !== null);
    const avgRelationshipStrength = contactsWithStrength.length > 0
      ? contactsWithStrength.reduce((sum, p) => sum + (p.relationshipStrength || 0), 0) / contactsWithStrength.length
      : 0;

    // Contact method counts
    const withTelegram = filteredPeople.filter(p => (p as any).telegramHandle).length;
    const withTwitter = filteredPeople.filter(p => (p as any).twitterHandle).length;

    // Get team members
    // TODO: In Phase 2, implement proper team member retrieval via TEAM_MEMBER relationships
    const teamMembers = await prisma.person.findMany({
      where: {
        currentOwner: { not: null }
      } as any, // Type assertion needed until prisma generate is run
      select: {
        id: true,
        fullName: true
      },
      distinct: ['id']
    });

    // Team coverage (simplified for Phase 1)
    const teamCoverage = await Promise.all(
      teamMembers.map(async (member) => {
        const contacts = filteredPeople.filter(p => (p as any).currentOwner === member.id);
        const strongConnections = contacts.filter(p =>
          p.relationshipStrength !== null && p.relationshipStrength >= 0.7
        ).length;

        return {
          teamMemberId: member.id,
          teamMemberName: member.fullName,
          contactCount: contacts.length,
          strongConnections
        };
      })
    );

    return NextResponse.json({
      contacts: filteredPeople,
      summary: {
        totalContacts,
        byGeography,
        byOwner,
        avgRelationshipStrength: Math.round(avgRelationshipStrength * 100) / 100,
        withTelegram,
        withTwitter
      },
      teamCoverage: teamCoverage.filter(tc => tc.contactCount > 0)
    });
  } catch (error) {
    console.error('Network API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch network data' },
      { status: 500 }
    );
  }
}
