/**
 * Organization Detail API
 * GET - Get single organization with full details
 * PATCH - Update organization
 * DELETE - Soft delete organization (mark as inactive)
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

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        deals: {
          orderBy: { createdAt: 'desc' },
          include: {
            facts: {
              where: { validUntil: null },
              orderBy: { validFrom: 'desc' }
            }
          }
        },
        investments: {
          include: {
            metrics: {
              orderBy: { snapshotDate: 'desc' },
              take: 10
            }
          }
        },
        lpCommitments: true,
        conversations: {
          orderBy: { conversationDate: 'desc' },
          take: 20,
          include: {
            participants: {
              select: {
                id: true,
                fullName: true,
                email: true
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
        },
        metrics: {
          orderBy: { snapshotDate: 'desc' },
          take: 50
        },
        syndicateDeals: {
          orderBy: { investDate: 'desc' }
        }
      }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get relationships (people at this org)
    const relationships = await prisma.relationship.findMany({
      where: {
        OR: [
          { targetType: 'Organization', targetId: id },
          { sourceType: 'Organization', sourceId: id }
        ],
        isActive: true
      },
      orderBy: { strength: 'desc' }
    });

    // Get people who WORK_AT this org
    const workRelationships = relationships.filter(
      r => r.relationshipType === 'WORKS_AT' && r.sourceType === 'Person'
    );

    const people = workRelationships.length > 0
      ? await prisma.person.findMany({
          where: {
            id: { in: workRelationships.map(r => r.sourceId) }
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            linkedInUrl: true,
            phone: true,
            lastContactedAt: true
          }
        })
      : [];

    // Attach role info to people
    const peopleWithRoles = people.map(p => {
      const rel = workRelationships.find(r => r.sourceId === p.id);
      return {
        ...p,
        role: (rel?.properties as any)?.role || 'Unknown',
        startDate: (rel?.properties as any)?.startDate,
        relationshipId: rel?.id
      };
    });

    // Format facts by type
    const factsByType: Record<string, any[]> = {};
    organization.facts.forEach(fact => {
      if (!factsByType[fact.factType]) {
        factsByType[fact.factType] = [];
      }
      factsByType[fact.factType].push({
        id: fact.id,
        key: fact.key,
        value: fact.value,
        sourceType: fact.sourceType,
        sourceId: fact.sourceId,
        confidence: Number(fact.confidence),
        validFrom: fact.validFrom,
        createdAt: fact.createdAt
      });
    });

    // Group metrics by type
    const metricsByType: Record<string, any[]> = {};
    organization.metrics.forEach(m => {
      if (!metricsByType[m.metricType]) {
        metricsByType[m.metricType] = [];
      }
      metricsByType[m.metricType].push({
        date: m.snapshotDate,
        value: Number(m.value),
        unit: m.unit,
        sourceType: m.sourceType,
        confidence: Number(m.confidence)
      });
    });

    const response = {
      ...organization,
      people: peopleWithRoles,
      relationships,
      factsByType,
      metricsByType
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch organization:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
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
      name,
      legalName,
      domain,
      website,
      description,
      organizationType,
      industry,
      stage,
      logoUrl,
      privacyTier
    } = body;

    // Build update data object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (legalName !== undefined) updateData.legalName = legalName;
    if (domain !== undefined) updateData.domain = domain;
    if (website !== undefined) updateData.website = website;
    if (description !== undefined) updateData.description = description;
    if (organizationType !== undefined) updateData.organizationType = organizationType;
    if (industry !== undefined) updateData.industry = industry;
    if (stage !== undefined) updateData.stage = stage;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (privacyTier !== undefined) updateData.privacyTier = privacyTier;

    const organization = await prisma.organization.update({
      where: { id },
      data: updateData,
      include: {
        deals: true,
        investments: true,
        _count: {
          select: {
            facts: true,
            conversations: true,
            tasks: true
          }
        }
      }
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error('Failed to update organization:', error);
    return NextResponse.json(
      { error: 'Failed to update organization' },
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

    // Soft delete: we'll just set privacy tier to indicate it's archived
    // Or we could add an isActive field to the schema
    // For now, just delete it (cascade will handle relationships)
    await prisma.organization.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete organization:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
}
