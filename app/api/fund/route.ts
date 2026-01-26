/**
 * Fund Investments API
 * Manages RBV Fund I portfolio positions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - List all fund investments with summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fundName = searchParams.get('fund') || 'Red Beard Ventures Fund I LP';
    const investmentType = searchParams.get('type');
    const sector = searchParams.get('sector');
    const status = searchParams.get('status');
    const isLiquid = searchParams.get('liquid');

    // Build where clause
    const where: Prisma.FundInvestmentWhereInput = {
      fundName,
    };

    if (investmentType) {
      where.investmentType = investmentType as Prisma.EnumFundInvestmentTypeFilter['equals'];
    }
    if (sector) {
      where.sector = sector;
    }
    if (status) {
      where.status = status as Prisma.EnumFundInvestmentStatusFilter['equals'];
    }
    if (isLiquid !== null && isLiquid !== undefined) {
      where.isLiquid = isLiquid === 'true';
    }

    // Fetch investments with organization
    const investments = await prisma.fundInvestment.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            website: true,
            description: true,
            industry: true,
          },
        },
        tokenSales: {
          orderBy: { saleDate: 'desc' },
          take: 5,
        },
      },
      orderBy: [
        { amountInvested: 'desc' },
      ],
    });

    // Calculate summary metrics
    const summary = investments.reduce(
      (acc, inv) => {
        const invested = Number(inv.amountInvested) || 0;
        const tokenVal = Number(inv.tokenValue) || 0;
        const equityVal = Number(inv.equityValue) || 0;
        const totalVal = Number(inv.totalValue) || tokenVal + equityVal;
        const realized = Number(inv.realizedValue) || 0;
        const liquid = Number(inv.liquidBalance) || 0;

        acc.totalInvested += invested;
        acc.totalTokenValue += tokenVal;
        acc.totalEquityValue += equityVal;
        acc.totalValue += totalVal;
        acc.totalRealized += realized;
        acc.liquidBalance += liquid;

        if (inv.isLiquid) acc.liquidPositions++;
        if (inv.investmentType === 'TOKEN_SAFT') acc.tokenPositions++;
        if (inv.investmentType === 'EQUITY') acc.equityPositions++;

        // Track sectors
        if (inv.sector) {
          acc.sectors[inv.sector] = (acc.sectors[inv.sector] || 0) + 1;
        }

        return acc;
      },
      {
        totalInvested: 0,
        totalTokenValue: 0,
        totalEquityValue: 0,
        totalValue: 0,
        totalRealized: 0,
        liquidBalance: 0,
        liquidPositions: 0,
        tokenPositions: 0,
        equityPositions: 0,
        sectors: {} as Record<string, number>,
      }
    );

    // Calculate performance metrics
    const tvpi = summary.totalInvested > 0
      ? (summary.totalValue + summary.totalRealized) / summary.totalInvested
      : 0;
    const dpi = summary.totalInvested > 0
      ? summary.totalRealized / summary.totalInvested
      : 0;
    const rvpi = summary.totalInvested > 0
      ? summary.totalValue / summary.totalInvested
      : 0;

    // Get unique sectors list
    const sectorsList = Object.entries(summary.sectors)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      investments,
      summary: {
        totalInvestments: investments.length,
        totalInvested: summary.totalInvested,
        totalTokenValue: summary.totalTokenValue,
        totalEquityValue: summary.totalEquityValue,
        totalValue: summary.totalValue,
        totalRealized: summary.totalRealized,
        liquidBalance: summary.liquidBalance,
        nonLiquidBalance: summary.totalValue - summary.liquidBalance,
        liquidPercent: summary.totalValue > 0
          ? (summary.liquidBalance / summary.totalValue) * 100
          : 0,
        tokenPositions: summary.tokenPositions,
        equityPositions: summary.equityPositions,
        liquidPositions: summary.liquidPositions,
        tvpi,
        dpi,
        rvpi,
        sectors: sectorsList,
      },
      fundName,
    });
  } catch (error) {
    console.error('Failed to fetch fund investments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fund investments' },
      { status: 500 }
    );
  }
}

// POST - Create a new fund investment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyName,
      nickname,
      fundName = 'Red Beard Ventures Fund I LP',
      investmentType = 'TOKEN_SAFT',
      status = 'ACTIVE',
      sector,
      amountInvested,
      investmentDate,
      tokenName,
      tokenQuantity,
      currentPrice,
      equityValue,
      ownershipPercent,
      launchDate,
      cliffMonths,
      initialReleasePercent,
      vestingPeriodicity,
      vestingPeriods,
      vestingEndDate,
      isLiquid = false,
      notes,
      organizationId,
    } = body;

    if (!companyName || amountInvested === undefined) {
      return NextResponse.json(
        { error: 'companyName and amountInvested are required' },
        { status: 400 }
      );
    }

    // Calculate values
    const tokenValue = tokenQuantity && currentPrice
      ? Number(tokenQuantity) * Number(currentPrice)
      : null;
    const totalValue = (tokenValue || 0) + (Number(equityValue) || 0);

    const investment = await prisma.fundInvestment.create({
      data: {
        companyName,
        nickname,
        fundName,
        investmentType,
        status,
        sector,
        amountInvested,
        investmentDate: investmentDate ? new Date(investmentDate) : null,
        tokenName,
        tokenQuantity,
        currentPrice,
        tokenValue,
        equityValue,
        ownershipPercent,
        totalValue: totalValue || null,
        launchDate: launchDate ? new Date(launchDate) : null,
        cliffMonths,
        initialReleasePercent,
        vestingPeriodicity,
        vestingPeriods,
        vestingEndDate: vestingEndDate ? new Date(vestingEndDate) : null,
        isLiquid,
        notes,
        organizationId,
        lastPriceUpdate: currentPrice ? new Date() : null,
      },
      include: {
        organization: true,
      },
    });

    return NextResponse.json({ success: true, investment });
  } catch (error) {
    console.error('Failed to create fund investment:', error);
    return NextResponse.json(
      { error: 'Failed to create fund investment' },
      { status: 500 }
    );
  }
}
