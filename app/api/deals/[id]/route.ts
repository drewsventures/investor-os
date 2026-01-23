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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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

    const deal = await prisma.deal.update({
      where: { id },
      data: updateData,
      include: {
        organization: true
      }
    });

    // If stage changed and note provided, add as fact
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
