/**
 * Deal Detail API
 * GET - Get single deal with full details
 * PATCH - Update deal (including stage changes)
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

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        organization: true,
        conversations: {
          orderBy: { conversationDate: 'desc' },
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
          orderBy: [
            { status: 'asc' },
            { priority: 'desc' },
            { dueDate: 'asc' }
          ]
        },
        facts: {
          where: { validUntil: null },
          orderBy: { validFrom: 'desc' }
        },
        stageHistory: {
          orderBy: { transitionDate: 'desc' }
        },
        investment: true
      }
    });

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Format facts by type
    const factsByType: Record<string, any[]> = {};
    deal.facts.forEach(fact => {
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

    return NextResponse.json({
      ...deal,
      factsByType
    });
  } catch (error) {
    console.error('Failed to fetch deal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deal' },
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
      stage,
      dealType,
      askAmount,
      ourAllocation,
      valuation,
      valuationType,
      expectedCloseDate,
      actualCloseDate,
      stageChangeNote
    } = body;

    // Get current deal to check for stage change
    const currentDeal = await prisma.deal.findUnique({
      where: { id },
      select: { stage: true, createdAt: true }
    });

    if (!currentDeal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (stage !== undefined) updateData.stage = stage;
    if (dealType !== undefined) updateData.dealType = dealType;
    if (askAmount !== undefined) updateData.askAmount = askAmount;
    if (ourAllocation !== undefined) updateData.ourAllocation = ourAllocation;
    if (valuation !== undefined) updateData.valuation = valuation;
    if (valuationType !== undefined) updateData.valuationType = valuationType;
    if (expectedCloseDate !== undefined) {
      updateData.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : null;
    }
    if (actualCloseDate !== undefined) {
      updateData.actualCloseDate = actualCloseDate ? new Date(actualCloseDate) : null;
    }

    // Track stage history if stage is changing
    if (stage !== undefined && stage !== currentDeal.stage) {
      // Get last stage history to calculate days in previous stage
      const lastHistory = await prisma.dealStageHistory.findFirst({
        where: { dealId: id },
        orderBy: { transitionDate: 'desc' }
      });

      const daysInPreviousStage = lastHistory
        ? Math.floor((Date.now() - new Date(lastHistory.transitionDate).getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((Date.now() - new Date(currentDeal.createdAt).getTime()) / (1000 * 60 * 60 * 24));

      await prisma.dealStageHistory.create({
        data: {
          dealId: id,
          fromStage: currentDeal.stage,
          toStage: stage,
          daysInPreviousStage,
          triggeredBy: 'manual',
          notes: stageChangeNote || null,
        }
      });
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: updateData,
      include: {
        organization: true,
        stageHistory: {
          orderBy: { transitionDate: 'desc' },
          take: 5
        }
      }
    });

    // If stage changed and note provided, also add as fact for searchability
    if (stage !== undefined && stageChangeNote) {
      await prisma.fact.create({
        data: {
          dealId: id,
          factType: 'note',
          key: 'stage_change',
          value: `${stageChangeNote} (Changed to: ${stage})`,
          sourceType: 'manual',
          confidence: 1.0
        }
      });
    }

    return NextResponse.json({ deal });
  } catch (error) {
    console.error('Failed to update deal:', error);
    return NextResponse.json(
      { error: 'Failed to update deal' },
      { status: 500 }
    );
  }
}
