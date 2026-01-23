/**
 * Investment Detail API
 * GET - Get single investment with full details and metrics
 * PATCH - Update investment (including marking exits)
 * DELETE - Delete investment
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

    const investment = await prisma.investment.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            legalName: true,
            domain: true,
            website: true,
            organizationType: true,
            industry: true,
            stage: true,
            description: true,
            logoUrl: true
          }
        },
        deal: {
          select: {
            id: true,
            name: true,
            dealType: true,
            stage: true,
            createdAt: true
          }
        },
        metrics: {
          orderBy: { snapshotDate: 'desc' },
          take: 50 // Last 50 data points for charting
        }
      }
    });

    if (!investment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    // Calculate returns
    const latestValuation = investment.currentValuation || investment.investmentAmount;
    const unrealizedGain = latestValuation - investment.investmentAmount;
    const unrealizedMultiple = latestValuation / investment.investmentAmount;

    let realizedGain = 0;
    let realizedMultiple = 0;
    let totalReturn = 0;
    let totalMultiple = unrealizedMultiple;

    if (investment.exitAmount) {
      realizedGain = investment.exitAmount - investment.investmentAmount;
      realizedMultiple = investment.exitAmount / investment.investmentAmount;
      totalReturn = realizedGain;
      totalMultiple = realizedMultiple;
    } else {
      totalReturn = unrealizedGain;
    }

    // Group metrics by type
    const metricsByType: Record<string, any[]> = {};
    investment.metrics.forEach(m => {
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
      ...investment,
      investmentAmount: Number(investment.investmentAmount),
      currentValuation: investment.currentValuation ? Number(investment.currentValuation) : null,
      ownership: investment.ownership ? Number(investment.ownership) : null,
      exitAmount: investment.exitAmount ? Number(investment.exitAmount) : null,
      unrealizedGain,
      unrealizedMultiple,
      realizedGain,
      realizedMultiple,
      totalReturn,
      totalMultiple,
      metricsByType
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch investment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch investment' },
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
      investmentDate,
      investmentAmount,
      ownership,
      currentValuation,
      status,
      exitDate,
      exitAmount,
      exitType,
      exitMultiple,
      notes,
      boardSeat,
      investorRights
    } = body;

    // Build update data
    const updateData: any = {};
    if (investmentDate !== undefined) updateData.investmentDate = new Date(investmentDate);
    if (investmentAmount !== undefined) updateData.investmentAmount = investmentAmount;
    if (ownership !== undefined) updateData.ownership = ownership;
    if (currentValuation !== undefined) updateData.currentValuation = currentValuation;
    if (status !== undefined) updateData.status = status;
    if (exitDate !== undefined) updateData.exitDate = exitDate ? new Date(exitDate) : null;
    if (exitAmount !== undefined) updateData.exitAmount = exitAmount;
    if (exitType !== undefined) updateData.exitType = exitType;
    if (exitMultiple !== undefined) updateData.exitMultiple = exitMultiple;
    if (notes !== undefined) updateData.notes = notes;
    if (boardSeat !== undefined) updateData.boardSeat = boardSeat;
    if (investorRights !== undefined) updateData.investorRights = investorRights;

    const investment = await prisma.investment.update({
      where: { id },
      data: updateData,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            organizationType: true,
            industry: true
          }
        },
        deal: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            metrics: true
          }
        }
      }
    });

    return NextResponse.json({
      investment: {
        ...investment,
        investmentAmount: Number(investment.investmentAmount),
        currentValuation: investment.currentValuation ? Number(investment.currentValuation) : null,
        ownership: investment.ownership ? Number(investment.ownership) : null,
        exitAmount: investment.exitAmount ? Number(investment.exitAmount) : null,
        exitMultiple: investment.exitMultiple ? Number(investment.exitMultiple) : null
      }
    });
  } catch (error) {
    console.error('Failed to update investment:', error);
    return NextResponse.json(
      { error: 'Failed to update investment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.investment.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete investment:', error);
    return NextResponse.json(
      { error: 'Failed to delete investment' },
      { status: 500 }
    );
  }
}
