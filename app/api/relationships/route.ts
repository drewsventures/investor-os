/**
 * Relationships API
 * GET - Query relationships (graph edges)
 * POST - Create a new relationship
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType'); // Person, Organization, Deal
    const entityId = searchParams.get('entityId');
    const relationshipType = searchParams.get('type'); // WORKS_AT, KNOWS, etc.
    const minStrength = parseFloat(searchParams.get('minStrength') || '0');

    // Build where clause
    const where: any = {
      isActive: true,
      strength: { gte: minStrength }
    };

    if (relationshipType) {
      where.relationshipType = relationshipType;
    }

    if (entityType && entityId) {
      where.OR = [
        { sourceType: entityType, sourceId: entityId },
        { targetType: entityType, targetId: entityId }
      ];
    }

    const relationships = await prisma.relationship.findMany({
      where,
      orderBy: [
        { strength: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 100 // Limit to prevent excessive data
    });

    // Get entity details for all relationships
    const personIds = new Set<string>();
    const orgIds = new Set<string>();

    relationships.forEach(r => {
      if (r.sourceType === 'Person') personIds.add(r.sourceId);
      if (r.targetType === 'Person') personIds.add(r.targetId);
      if (r.sourceType === 'Organization') orgIds.add(r.sourceId);
      if (r.targetType === 'Organization') orgIds.add(r.targetId);
    });

    const [people, organizations] = await Promise.all([
      personIds.size > 0
        ? prisma.person.findMany({
            where: { id: { in: Array.from(personIds) } },
            select: { id: true, fullName: true, email: true }
          })
        : [],
      orgIds.size > 0
        ? prisma.organization.findMany({
            where: { id: { in: Array.from(orgIds) } },
            select: { id: true, name: true, organizationType: true }
          })
        : []
    ]);

    // Attach entity details to relationships
    const enrichedRelationships = relationships.map(r => {
      const sourceEntity =
        r.sourceType === 'Person'
          ? people.find(p => p.id === r.sourceId)
          : organizations.find(o => o.id === r.sourceId);

      const targetEntity =
        r.targetType === 'Person'
          ? people.find(p => p.id === r.targetId)
          : organizations.find(o => o.id === r.targetId);

      return {
        ...r,
        sourceEntity,
        targetEntity
      };
    });

    // Group by relationship type
    const byType = enrichedRelationships.reduce((acc, r) => {
      acc[r.relationshipType] = (acc[r.relationshipType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const summary = {
      totalRelationships: relationships.length,
      byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
      uniquePeople: personIds.size,
      uniqueOrganizations: orgIds.size
    };

    return NextResponse.json({
      relationships: enrichedRelationships,
      summary
    });
  } catch (error) {
    console.error('Failed to fetch relationships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch relationships' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sourceType,
      sourceId,
      targetType,
      targetId,
      relationshipType,
      properties,
      strength,
      confidence,
      sourceOfTruth,
      sourceIdRef
    } = body;

    // Validate required fields
    if (!sourceType || !sourceId || !targetType || !targetId || !relationshipType || !sourceOfTruth) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Parse properties if it's a string
    let parsedProperties = null;
    if (properties) {
      if (typeof properties === 'string') {
        try {
          parsedProperties = JSON.parse(properties);
        } catch {
          parsedProperties = { raw: properties };
        }
      } else {
        parsedProperties = properties;
      }
    }

    const relationship = await prisma.relationship.create({
      data: {
        sourceType,
        sourceId,
        targetType,
        targetId,
        relationshipType,
        properties: parsedProperties,
        strength: strength || 1.0,
        confidence: confidence || 1.0,
        sourceOfTruth,
        sourceId_ref: sourceIdRef,
        isActive: true,
        validFrom: new Date()
      }
    });

    return NextResponse.json({ relationship }, { status: 201 });
  } catch (error) {
    console.error('Failed to create relationship:', error);
    return NextResponse.json(
      { error: 'Failed to create relationship' },
      { status: 500 }
    );
  }
}
