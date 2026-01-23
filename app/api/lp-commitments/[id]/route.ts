/**
 * LP Commitment Detail API
 * GET - Get single LP commitment with full details
 * PATCH - Update LP commitment (capital calls, distributions)
 * DELETE - Delete LP commitment
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

    const commitment = await prisma.lPCommitment.findUnique({
      where: { id },
      include: {
        person: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            linkedInUrl: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
            legalName: true,
            organizationType: true,
            website: true,
            description: true
          }
        }
      }
    });

    if (!commitment) {
      return NextResponse.json({ error: 'LP commitment not found' }, { status: 404 });
    }

    // Calculate statistics
    const commitmentAmt = Number(commitment.commitmentAmount);
    const calledAmt = Number(commitment.calledAmount) || 0;
    const returnedAmt = Number(commitment.returnedAmount) || 0;

    const uncalledAmount = commitmentAmt - calledAmt;
    const callRate = commitmentAmt > 0 ? (calledAmt / commitmentAmt) * 100 : 0;
    const netContribution = calledAmt - returnedAmt;
    const moic = calledAmt > 0 ? returnedAmt / calledAmt : 0;
    const irr = null; // Would require time-series calculation with dates

    const response = {
      ...commitment,
      commitmentAmount: commitmentAmt,
      calledAmount: calledAmt,
      returnedAmount: returnedAmt,
      uncalledAmount,
      callRate,
      netContribution,
      moic,
      irr
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch LP commitment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LP commitment' },
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
      fundName,
      commitmentAmount,
      calledAmount,
      returnedAmount,
      commitmentDate,
      isActive,
      notes
    } = body;

    // Build update data
    const updateData: any = {};
    if (fundName !== undefined) updateData.fundName = fundName;
    if (commitmentAmount !== undefined) updateData.commitmentAmount = commitmentAmount;
    if (calledAmount !== undefined) updateData.calledAmount = calledAmount;
    if (returnedAmount !== undefined) updateData.returnedAmount = returnedAmount;
    if (commitmentDate !== undefined) updateData.commitmentDate = new Date(commitmentDate);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (notes !== undefined) updateData.notes = notes;

    const commitment = await prisma.lPCommitment.update({
      where: { id },
      data: updateData,
      include: {
        person: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
            organizationType: true
          }
        }
      }
    });

    // Calculate stats
    const commitmentAmt = Number(commitment.commitmentAmount);
    const calledAmt = Number(commitment.calledAmount) || 0;
    const returnedAmt = Number(commitment.returnedAmount) || 0;

    return NextResponse.json({
      commitment: {
        ...commitment,
        commitmentAmount: commitmentAmt,
        calledAmount: calledAmt,
        returnedAmount: returnedAmt,
        uncalledAmount: commitmentAmt - calledAmt,
        callRate: commitmentAmt > 0 ? (calledAmt / commitmentAmt) * 100 : 0,
        netContribution: calledAmt - returnedAmt,
        moic: calledAmt > 0 ? returnedAmt / calledAmt : 0
      }
    });
  } catch (error) {
    console.error('Failed to update LP commitment:', error);
    return NextResponse.json(
      { error: 'Failed to update LP commitment' },
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

    await prisma.lPCommitment.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete LP commitment:', error);
    return NextResponse.json(
      { error: 'Failed to delete LP commitment' },
      { status: 500 }
    );
  }
}
