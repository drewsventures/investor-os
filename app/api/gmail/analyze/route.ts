/**
 * Gmail Analyze Route
 * Generate AI summaries, action items, and relationship strength
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  generateRelationshipSummary,
  extractActionItems,
} from '@/lib/gmail/ai-analysis';
import {
  calculateRelationshipStrength,
  updateRelationshipStrength,
} from '@/lib/gmail/relationship-strength';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute for AI processing

// POST - Analyze relationship for a person or organization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    if (entityType === 'person') {
      // Verify person exists
      const person = await prisma.person.findUnique({
        where: { id: entityId },
        select: { id: true, fullName: true, email: true },
      });

      if (!person) {
        return NextResponse.json({ error: 'Person not found' }, { status: 404 });
      }

      // Check if they have any email interactions
      const emailCount = await prisma.emailPersonLink.count({
        where: { personId: entityId },
      });

      if (emailCount === 0) {
        return NextResponse.json({
          success: true,
          entityType: 'person',
          entityId,
          message: 'No email interactions found for this person',
          data: null,
        });
      }

      // Generate analysis in parallel
      const [relationshipSummary, actionItems, strengthResult] = await Promise.all([
        generateRelationshipSummary(entityId),
        extractActionItems(entityId),
        calculateRelationshipStrength(entityId),
      ]);

      // Update cached relationship strength
      await updateRelationshipStrength(entityId, true);

      return NextResponse.json({
        success: true,
        entityType: 'person',
        entityId,
        person: {
          id: person.id,
          name: person.fullName,
          email: person.email,
        },
        data: {
          relationshipSummary,
          actionItems,
          strength: strengthResult
            ? {
                score: strengthResult.strength,
                trend: strengthResult.trend,
                factors: strengthResult.factors,
                totalEmails: strengthResult.totalEmails,
                lastEmailAt: strengthResult.lastEmailAt,
              }
            : null,
        },
      });
    } else if (entityType === 'organization') {
      // For organizations, aggregate across all linked people
      const org = await prisma.organization.findUnique({
        where: { id: entityId },
        select: { id: true, name: true, domain: true },
      });

      if (!org) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }

      // Get email count for org
      const emailCount = await prisma.emailOrgLink.count({
        where: { organizationId: entityId },
      });

      if (emailCount === 0) {
        return NextResponse.json({
          success: true,
          entityType: 'organization',
          entityId,
          message: 'No email interactions found for this organization',
          data: null,
        });
      }

      // Get all persons linked via this org's emails
      const linkedPersons = await prisma.emailPersonLink.findMany({
        where: {
          email: {
            orgLinks: { some: { organizationId: entityId } },
          },
        },
        distinct: ['personId'],
        select: {
          personId: true,
          person: { select: { id: true, fullName: true, email: true } },
        },
      });

      // Calculate aggregate stats
      const orgEmails = await prisma.emailMessage.findMany({
        where: {
          orgLinks: { some: { organizationId: entityId } },
        },
        orderBy: { sentAt: 'desc' },
        take: 20,
        select: {
          subject: true,
          sentAt: true,
          isInbound: true,
        },
      });

      const inbound = orgEmails.filter((e) => e.isInbound).length;
      const outbound = orgEmails.filter((e) => !e.isInbound).length;

      return NextResponse.json({
        success: true,
        entityType: 'organization',
        entityId,
        organization: {
          id: org.id,
          name: org.name,
          domain: org.domain,
        },
        data: {
          totalEmails: emailCount,
          recentEmails: orgEmails.length,
          inboundEmails: inbound,
          outboundEmails: outbound,
          lastEmailAt: orgEmails[0]?.sentAt || null,
          linkedPersons: linkedPersons.map((lp) => ({
            id: lp.person.id,
            name: lp.person.fullName,
            email: lp.person.email,
          })),
        },
      });
    } else {
      return NextResponse.json(
        { error: 'entityType must be "person" or "organization"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Gmail analyze error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze emails' },
      { status: 500 }
    );
  }
}

// GET - Get cached relationship strength for a person
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get('personId');

    if (!personId) {
      return NextResponse.json(
        { error: 'personId is required' },
        { status: 400 }
      );
    }

    // Get cached strength
    const strength = await prisma.relationshipStrength.findUnique({
      where: { personId },
    });

    if (!strength) {
      // Calculate on-the-fly if not cached
      const result = await calculateRelationshipStrength(personId);
      if (!result) {
        return NextResponse.json({ strength: null, cached: false });
      }
      return NextResponse.json({
        strength: result,
        cached: false,
      });
    }

    return NextResponse.json({
      strength: {
        score: Number(strength.strength),
        trend: strength.trend,
        factors: {
          recency: Number(strength.recencyScore),
          frequency: Number(strength.frequencyScore),
          engagement: Number(strength.engagementScore),
          reciprocity: Number(strength.reciprocityScore),
        },
        totalEmails: strength.totalEmails,
        lastEmailAt: strength.lastEmailAt,
        aiSummary: strength.aiSummary,
        aiRecommendation: strength.aiRecommendation,
        calculatedAt: strength.calculatedAt,
      },
      cached: true,
    });
  } catch (error) {
    console.error('Gmail analyze GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get relationship strength' },
      { status: 500 }
    );
  }
}
