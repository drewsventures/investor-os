/**
 * Facts API
 * GET - Query facts with filtering
 * POST - Add a new fact (with automatic conflict detection)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { addFactWithConflictDetection, type FactInput } from '@/lib/normalization/conflict-resolution';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType'); // person, organization, deal
    const entityId = searchParams.get('entityId');
    const factType = searchParams.get('factType');
    const key = searchParams.get('key');
    const includeHistorical = searchParams.get('includeHistorical') === 'true';

    // Build where clause
    const where: any = {};

    // Entity filtering
    if (entityType === 'person' && entityId) {
      where.personId = entityId;
    } else if (entityType === 'organization' && entityId) {
      where.organizationId = entityId;
    } else if (entityType === 'deal' && entityId) {
      where.dealId = entityId;
    }

    if (factType) where.factType = factType;
    if (key) where.key = key;

    // Only current facts unless explicitly requesting historical
    if (!includeHistorical) {
      where.validUntil = null;
    }

    const facts = await prisma.fact.findMany({
      where,
      orderBy: [
        { validFrom: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 200 // Limit results
    });

    // Group by factType and key for easier consumption
    const grouped: Record<string, Record<string, any[]>> = {};
    facts.forEach(fact => {
      if (!grouped[fact.factType]) {
        grouped[fact.factType] = {};
      }
      if (!grouped[fact.factType][fact.key]) {
        grouped[fact.factType][fact.key] = [];
      }
      grouped[fact.factType][fact.key].push({
        id: fact.id,
        value: fact.value,
        sourceType: fact.sourceType,
        sourceId: fact.sourceId,
        sourceUrl: fact.sourceUrl,
        confidence: Number(fact.confidence),
        validFrom: fact.validFrom,
        validUntil: fact.validUntil,
        createdAt: fact.createdAt,
        createdBy: fact.createdBy
      });
    });

    const summary = {
      totalFacts: facts.length,
      factTypes: Object.keys(grouped),
      byType: Object.entries(grouped).map(([type, keys]) => ({
        type,
        keyCount: Object.keys(keys).length,
        factCount: Object.values(keys).flat().length
      }))
    };

    return NextResponse.json({
      facts,
      grouped,
      summary
    });
  } catch (error) {
    console.error('Failed to fetch facts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch facts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      entityType,
      entityId,
      factType,
      key,
      value,
      sourceType,
      sourceId,
      sourceUrl,
      confidence,
      createdBy
    } = body;

    // Validate required fields
    if (!entityType || !entityId || !factType || !key || !value || !sourceType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Build fact input
    const factInput: FactInput = {
      factType,
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
      sourceType,
      sourceId,
      sourceUrl,
      confidence: confidence || 1.0,
      createdBy
    };

    // Map entity type to correct ID field
    if (entityType === 'person') {
      factInput.personId = entityId;
    } else if (entityType === 'organization') {
      factInput.organizationId = entityId;
    } else if (entityType === 'deal') {
      factInput.dealId = entityId;
    } else if (entityType === 'conversation') {
      factInput.conversationId = entityId;
    } else {
      return NextResponse.json(
        { error: 'Invalid entityType' },
        { status: 400 }
      );
    }

    // Add fact with conflict detection
    const result = await addFactWithConflictDetection(factInput);

    if (result.requiresManualReview) {
      return NextResponse.json({
        success: false,
        requiresManualReview: true,
        conflict: result.conflict,
        message: 'Conflict detected - manual review required'
      }, { status: 409 }); // 409 Conflict
    }

    return NextResponse.json({
      success: true,
      factId: result.factId,
      conflict: result.conflict,
      resolution: result.resolution
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to add fact:', error);
    return NextResponse.json(
      { error: 'Failed to add fact' },
      { status: 500 }
    );
  }
}
