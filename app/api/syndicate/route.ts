/**
 * Syndicate Deals API
 * GET - List all syndicate deals with filtering and summary stats
 * POST - Create a new syndicate deal or bulk import
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - List syndicate deals
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const status = searchParams.get('status');
  const isHosted = searchParams.get('isHosted');
  const market = searchParams.get('market');
  const search = searchParams.get('search');
  const leadSyndicate = searchParams.get('leadSyndicate');

  try {
    const where: Prisma.SyndicateDealWhereInput = {};

    if (status) {
      where.status = status as 'LIVE' | 'REALIZED' | 'CLOSING' | 'TRANSFERRED';
    }

    if (isHosted === 'true') {
      where.isHostedDeal = true;
    } else if (isHosted === 'false') {
      where.isHostedDeal = false;
    }

    if (market) {
      where.market = market;
    }

    if (leadSyndicate) {
      where.leadSyndicate = leadSyndicate;
    }

    if (search) {
      where.companyName = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const deals = await prisma.syndicateDeal.findMany({
      where,
      orderBy: { investDate: 'desc' },
    });

    // Calculate summary stats
    const allDeals = await prisma.syndicateDeal.findMany();

    const totalInvested = allDeals.reduce((sum, d) => sum + Number(d.invested || 0), 0);
    const totalNetValue = allDeals.reduce((sum, d) => sum + Number(d.netValue || 0), 0);
    const liveDeals = allDeals.filter(d => d.status === 'LIVE').length;
    const realizedDeals = allDeals.filter(d => d.status === 'REALIZED').length;
    const hostedDeals = allDeals.filter(d => d.isHostedDeal).length;
    const coSyndicateDeals = allDeals.filter(d => !d.isHostedDeal).length;

    // Market breakdown
    const marketBreakdown = allDeals.reduce((acc, d) => {
      const m = d.market || 'Other';
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Status breakdown
    const statusBreakdown = allDeals.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get unique markets for filtering
    const markets = [...new Set(allDeals.map(d => d.market).filter(Boolean))].sort();

    // Get unique lead syndicates for filtering (only co-syndicates have meaningful leads)
    const leadSyndicates = [...new Set(
      allDeals
        .filter(d => !d.isHostedDeal && d.leadSyndicate)
        .map(d => d.leadSyndicate)
    )].filter(Boolean).sort() as string[];

    // Lead syndicate breakdown (for co-syndicates only)
    const leadSyndicateBreakdown = allDeals
      .filter(d => !d.isHostedDeal && d.leadSyndicate)
      .reduce((acc, d) => {
        const lead = d.leadSyndicate!;
        if (!acc[lead]) {
          acc[lead] = { count: 0, invested: 0 };
        }
        acc[lead].count++;
        acc[lead].invested += Number(d.invested || 0);
        return acc;
      }, {} as Record<string, { count: number; invested: number }>);

    return NextResponse.json({
      deals,
      summary: {
        totalDeals: allDeals.length,
        totalInvested,
        totalNetValue,
        overallMultiple: totalInvested > 0 ? totalNetValue / totalInvested : 0,
        liveDeals,
        realizedDeals,
        hostedDeals,
        coSyndicateDeals,
        marketBreakdown,
        statusBreakdown,
        markets,
        leadSyndicates,
        leadSyndicateBreakdown,
      },
    });
  } catch (error) {
    console.error('Failed to fetch syndicate deals:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch deals' },
      { status: 500 }
    );
  }
}

// POST - Create syndicate deal(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle bulk import
    if (Array.isArray(body)) {
      const results = [];
      for (const deal of body) {
        const created = await createSyndicateDeal(deal);
        results.push(created);
      }
      return NextResponse.json({ deals: results, count: results.length }, { status: 201 });
    }

    // Handle single create
    const deal = await createSyndicateDeal(body);
    return NextResponse.json({ deal }, { status: 201 });
  } catch (error) {
    console.error('Failed to create syndicate deal:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create deal' },
      { status: 500 }
    );
  }
}

async function createSyndicateDeal(data: Record<string, unknown>) {
  // Check for existing deal with same company name and invest date
  const existing = await prisma.syndicateDeal.findFirst({
    where: {
      companyName: data.companyName as string,
      investDate: data.investDate ? new Date(data.investDate as string) : undefined,
      fundName: data.fundName as string | undefined,
    },
  });

  if (existing) {
    // Update existing
    return prisma.syndicateDeal.update({
      where: { id: existing.id },
      data: {
        ...data,
        investDate: data.investDate ? new Date(data.investDate as string) : null,
        invested: data.invested ? parseFloat(String(data.invested)) : 0,
        unrealizedValue: data.unrealizedValue ? parseFloat(String(data.unrealizedValue)) : null,
        realizedValue: data.realizedValue ? parseFloat(String(data.realizedValue)) : null,
        netValue: data.netValue ? parseFloat(String(data.netValue)) : null,
        multiple: data.multiple ? parseFloat(String(data.multiple)) : null,
        roundSize: data.roundSize ? parseFloat(String(data.roundSize)) : null,
        allocation: data.allocation ? parseFloat(String(data.allocation)) : null,
        valuation: data.valuation ? parseFloat(String(data.valuation)) : null,
        discount: data.discount ? parseFloat(String(data.discount)) : null,
        carry: data.carry ? parseFloat(String(data.carry)) : null,
      } as Prisma.SyndicateDealUpdateInput,
    });
  }

  // Create new
  return prisma.syndicateDeal.create({
    data: {
      companyName: data.companyName as string,
      companyDomain: data.companyDomain as string | undefined,
      market: data.market as string | undefined,
      status: (data.status as 'LIVE' | 'REALIZED' | 'CLOSING' | 'TRANSFERRED') || 'LIVE',
      dealType: (data.dealType as 'SYNDICATE' | 'FUND') || 'SYNDICATE',
      isHostedDeal: data.isHostedDeal as boolean || false,
      investDate: data.investDate ? new Date(data.investDate as string) : null,
      invested: data.invested ? parseFloat(String(data.invested)) : 0,
      unrealizedValue: data.unrealizedValue ? parseFloat(String(data.unrealizedValue)) : null,
      realizedValue: data.realizedValue ? parseFloat(String(data.realizedValue)) : null,
      netValue: data.netValue ? parseFloat(String(data.netValue)) : null,
      multiple: data.multiple ? parseFloat(String(data.multiple)) : null,
      investmentEntity: data.investmentEntity as string || '',
      leadSyndicate: data.leadSyndicate as string | undefined,
      fundName: data.fundName as string | undefined,
      round: data.round as string | undefined,
      instrument: data.instrument as string | undefined,
      roundSize: data.roundSize ? parseFloat(String(data.roundSize)) : null,
      allocation: data.allocation ? parseFloat(String(data.allocation)) : null,
      valuationType: data.valuationType as string | undefined,
      valuation: data.valuation ? parseFloat(String(data.valuation)) : null,
      discount: data.discount ? parseFloat(String(data.discount)) : null,
      carry: data.carry ? parseFloat(String(data.carry)) : null,
      shareClass: data.shareClass as string | undefined,
    },
  });
}
