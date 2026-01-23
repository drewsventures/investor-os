/**
 * LP Commitments API
 * GET - List LP commitments with statistics
 * POST - Create a new LP commitment
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get('personId');
    const organizationId = searchParams.get('organizationId');
    const fundName = searchParams.get('fundName');
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: any = {};

    if (personId) where.personId = personId;
    if (organizationId) where.organizationId = organizationId;
    if (fundName) where.fundName = { contains: fundName, mode: 'insensitive' };
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const commitments = await prisma.lPCommitment.findMany({
      where,
      include: {
        person: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
            organizationType: true,
            website: true
          }
        }
      },
      orderBy: { commitmentDate: 'desc' }
    });

    // Calculate statistics for each commitment
    const enrichedCommitments = commitments.map(commitment => {
      const commitmentAmt = Number(commitment.commitmentAmount);
      const calledAmt = Number(commitment.calledAmount) || 0;
      const returnedAmt = Number(commitment.returnedAmount) || 0;

      const uncalledAmount = commitmentAmt - calledAmt;
      const callRate = commitmentAmt > 0 ? (calledAmt / commitmentAmt) * 100 : 0;
      const netContribution = calledAmt - returnedAmt;
      const moic = calledAmt > 0 ? returnedAmt / calledAmt : 0;

      return {
        ...commitment,
        commitmentAmount: commitmentAmt,
        calledAmount: calledAmt,
        returnedAmount: returnedAmt,
        uncalledAmount,
        callRate,
        netContribution,
        moic
      };
    });

    // Fund-level summary
    const summary = {
      totalCommitments: enrichedCommitments.length,
      activeCommitments: enrichedCommitments.filter(c => c.isActive).length,
      totalCommitmentAmount: enrichedCommitments.reduce((sum, c) => sum + c.commitmentAmount, 0),
      totalCalledAmount: enrichedCommitments.reduce((sum, c) => sum + c.calledAmount, 0),
      totalReturnedAmount: enrichedCommitments.reduce((sum, c) => sum + c.returnedAmount, 0),
      totalUncalledAmount: enrichedCommitments.reduce((sum, c) => sum + c.uncalledAmount, 0),
      byFund: enrichedCommitments.reduce((acc, c) => {
        if (!acc[c.fundName]) {
          acc[c.fundName] = {
            count: 0,
            totalCommitment: 0,
            totalCalled: 0,
            totalReturned: 0
          };
        }
        acc[c.fundName].count++;
        acc[c.fundName].totalCommitment += c.commitmentAmount;
        acc[c.fundName].totalCalled += c.calledAmount;
        acc[c.fundName].totalReturned += c.returnedAmount;
        return acc;
      }, {} as Record<string, any>)
    };

    return NextResponse.json({
      commitments: enrichedCommitments,
      summary
    });
  } catch (error) {
    console.error('Failed to fetch LP commitments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LP commitments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      personId,
      organizationId,
      fundName,
      commitmentAmount,
      calledAmount,
      returnedAmount,
      commitmentDate,
      isActive,
      notes
    } = body;

    // Validate required fields
    if (!fundName || !commitmentAmount || !commitmentDate) {
      return NextResponse.json(
        { error: 'Missing required fields: fundName, commitmentAmount, commitmentDate' },
        { status: 400 }
      );
    }

    // Must have either personId or organizationId (LP can be individual or institution)
    if (!personId && !organizationId) {
      return NextResponse.json(
        { error: 'Must provide either personId or organizationId for the LP' },
        { status: 400 }
      );
    }

    // Create LP commitment
    const commitment = await prisma.lPCommitment.create({
      data: {
        personId,
        organizationId,
        fundName,
        commitmentAmount,
        calledAmount: calledAmount || 0,
        returnedAmount: returnedAmount || 0,
        commitmentDate: new Date(commitmentDate),
        isActive: isActive !== undefined ? isActive : true,
        notes
      },
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
    const calledAmt = Number(commitment.calledAmount);
    const returnedAmt = Number(commitment.returnedAmount);

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create LP commitment:', error);
    return NextResponse.json(
      { error: 'Failed to create LP commitment' },
      { status: 500 }
    );
  }
}
