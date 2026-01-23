/**
 * Person Detail API
 * GET - Get single person with full details
 * PATCH - Update person
 * DELETE - Delete person
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await segmentData.params;

    const person = await prisma.person.findUnique({
      where: { id },
      include: {
        lpCommitments: true,
        conversations: {
          orderBy: { conversationDate: 'desc' },
          take: 20,
          include: {
            organizations: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        tasks: {
          where: {
            status: { not: 'DONE' }
          },
          orderBy: [
            { priority: 'desc' },
            { dueDate: 'asc' }
          ]
        },
        facts: {
          where: { validUntil: null },
          orderBy: { validFrom: 'desc' }
        }
      }
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    // Get all relationships
    const relationships = await prisma.relationship.findMany({
      where: {
        OR: [
          { sourceType: 'Person', sourceId: id },
          { targetType: 'Person', targetId: id }
        ],
        isActive: true
      },
      orderBy: { strength: 'desc' }
    });

    // Get organizations this person is associated with
    const orgRelationships = relationships.filter(
      r => r.sourceType === 'Person' && r.targetType === 'Organization'
    );

    const organizations = orgRelationships.length > 0
      ? await prisma.organization.findMany({
          where: {
            id: { in: orgRelationships.map(r => r.targetId) }
          },
          select: {
            id: true,
            name: true,
            domain: true,
            organizationType: true,
            industry: true,
            stage: true
          }
        })
      : [];

    const orgsWithRoles = organizations.map(o => {
      const rel = orgRelationships.find(r => r.targetId === o.id);
      return {
        ...o,
        relationshipType: rel?.relationshipType,
        role: (rel?.properties as any)?.role,
        startDate: (rel?.properties as any)?.startDate,
        isActive: rel?.isActive,
        strength: Number(rel?.strength || 0),
        relationshipId: rel?.id
      };
    });

    // Get people this person knows
    const personRelationships = relationships.filter(
      r => (r.sourceType === 'Person' && r.targetType === 'Person') ||
           (r.targetType === 'Person' && r.sourceType === 'Person')
    );

    const connectedPersonIds = personRelationships.map(r =>
      r.sourceId === id ? r.targetId : r.sourceId
    );

    const connectedPeople = connectedPersonIds.length > 0
      ? await prisma.person.findMany({
          where: {
            id: { in: connectedPersonIds }
          },
          select: {
            id: true,
            fullName: true,
            email: true
          }
        })
      : [];

    const peopleWithRelationships = connectedPeople.map(p => {
      const rel = personRelationships.find(r =>
        r.sourceId === p.id || r.targetId === p.id
      );
      return {
        ...p,
        relationshipType: rel?.relationshipType,
        strength: Number(rel?.strength || 0),
        context: (rel?.properties as any)?.context
      };
    });

    // Format facts by type
    const factsByType: Record<string, any[]> = {};
    person.facts.forEach(fact => {
      if (!factsByType[fact.factType]) {
        factsByType[fact.factType] = [];
      }
      factsByType[fact.factType].push({
        id: fact.id,
        key: fact.key,
        value: fact.value,
        sourceType: fact.sourceType,
        confidence: Number(fact.confidence),
        validFrom: fact.validFrom
      });
    });

    const response = {
      ...person,
      organizations: orgsWithRoles,
      connectedPeople: peopleWithRelationships,
      relationships,
      factsByType
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch person:', error);
    return NextResponse.json(
      { error: 'Failed to fetch person' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await segmentData.params;
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

    // Build update data
    const updateData: any = {};
    if (firstName !== undefined) {
      updateData.firstName = firstName;
      updateData.fullName = `${firstName} ${body.lastName || ''}`.trim();
    }
    if (lastName !== undefined) {
      updateData.lastName = lastName;
      updateData.fullName = `${body.firstName || ''} ${lastName}`.trim();
    }
    if (email !== undefined) updateData.email = email;
    if (linkedInUrl !== undefined) updateData.linkedInUrl = linkedInUrl;
    if (twitterHandle !== undefined) updateData.twitterHandle = twitterHandle;
    if (phone !== undefined) updateData.phone = phone;
    if (privacyTier !== undefined) updateData.privacyTier = privacyTier;

    const person = await prisma.person.update({
      where: { id },
      data: updateData,
      include: {
        lpCommitments: true,
        _count: {
          select: {
            conversations: true,
            tasks: true,
            facts: true
          }
        }
      }
    });

    return NextResponse.json({ person });
  } catch (error) {
    console.error('Failed to update person:', error);
    return NextResponse.json(
      { error: 'Failed to update person' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await segmentData.params;

    await prisma.person.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete person:', error);
    return NextResponse.json(
      { error: 'Failed to delete person' },
      { status: 500 }
    );
  }
}
