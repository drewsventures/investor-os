/**
 * Fund Vesting Schedule API
 * Returns upcoming vesting events for fund investments
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface VestingEvent {
  id: string;
  companyName: string;
  tokenName: string | null;
  vestingDate: Date;
  eventType: 'cliff' | 'vesting' | 'final';
  tokensUnlocking: number | null;
  estimatedValue: number | null;
  isLiquid: boolean;
  currentPrice: number | null;
  organizationId: string | null;
}

// GET - Get upcoming vesting events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('days') || '90');
    const fundName = searchParams.get('fund') || 'Red Beard Ventures Fund I LP';

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Get all fund investments with vesting schedules
    const investments = await prisma.fundInvestment.findMany({
      where: {
        fundName,
        OR: [
          { launchDate: { not: null } },
          { vestingEndDate: { not: null } },
        ],
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const vestingEvents: VestingEvent[] = [];

    for (const inv of investments) {
      const tokenQuantity = Number(inv.tokenQuantity) || 0;
      const currentPrice = Number(inv.currentPrice) || 0;
      const cliffMonths = inv.cliffMonths || 0;
      const initialReleasePercent = Number(inv.initialReleasePercent) || 10;
      const vestingPeriods = inv.vestingPeriods || 12;
      const vestingPeriodicity = inv.vestingPeriodicity || 'monthly';

      // If we have a launch date, calculate vesting events
      if (inv.launchDate) {
        const launchDate = new Date(inv.launchDate);

        // Cliff date (initial release)
        const cliffDate = new Date(launchDate);
        cliffDate.setMonth(cliffDate.getMonth() + cliffMonths);

        if (cliffDate >= now && cliffDate <= futureDate) {
          const tokensAtCliff = tokenQuantity * (initialReleasePercent / 100);
          vestingEvents.push({
            id: `${inv.id}-cliff`,
            companyName: inv.companyName,
            tokenName: inv.tokenName,
            vestingDate: cliffDate,
            eventType: 'cliff',
            tokensUnlocking: tokensAtCliff,
            estimatedValue: tokensAtCliff * currentPrice,
            isLiquid: inv.isLiquid,
            currentPrice,
            organizationId: inv.organizationId,
          });
        }

        // Calculate periodic vesting events
        const tokensAfterCliff = tokenQuantity * (1 - initialReleasePercent / 100);
        const tokensPerPeriod = tokensAfterCliff / vestingPeriods;

        // Determine period length in months
        let periodMonths = 1;
        if (vestingPeriodicity === 'quarterly') periodMonths = 3;
        if (vestingPeriodicity === 'daily') periodMonths = 0; // Skip daily for calendar (too granular)

        if (periodMonths > 0) {
          for (let i = 1; i <= vestingPeriods; i++) {
            const vestingDate = new Date(cliffDate);
            vestingDate.setMonth(vestingDate.getMonth() + (i * periodMonths));

            if (vestingDate >= now && vestingDate <= futureDate) {
              const isFinal = i === vestingPeriods;
              vestingEvents.push({
                id: `${inv.id}-vest-${i}`,
                companyName: inv.companyName,
                tokenName: inv.tokenName,
                vestingDate,
                eventType: isFinal ? 'final' : 'vesting',
                tokensUnlocking: tokensPerPeriod,
                estimatedValue: tokensPerPeriod * currentPrice,
                isLiquid: inv.isLiquid,
                currentPrice,
                organizationId: inv.organizationId,
              });
            }
          }
        }
      }

      // If we have a vesting end date but no launch date, add that as a final event
      if (inv.vestingEndDate && !inv.launchDate) {
        const endDate = new Date(inv.vestingEndDate);
        if (endDate >= now && endDate <= futureDate) {
          vestingEvents.push({
            id: `${inv.id}-end`,
            companyName: inv.companyName,
            tokenName: inv.tokenName,
            vestingDate: endDate,
            eventType: 'final',
            tokensUnlocking: tokenQuantity,
            estimatedValue: tokenQuantity * currentPrice,
            isLiquid: inv.isLiquid,
            currentPrice,
            organizationId: inv.organizationId,
          });
        }
      }
    }

    // Sort by date
    vestingEvents.sort((a, b) => a.vestingDate.getTime() - b.vestingDate.getTime());

    // Calculate summary
    const summary = {
      totalEvents: vestingEvents.length,
      totalTokensUnlocking: vestingEvents.reduce((sum, e) => sum + (e.tokensUnlocking || 0), 0),
      totalEstimatedValue: vestingEvents.reduce((sum, e) => sum + (e.estimatedValue || 0), 0),
      next30Days: vestingEvents.filter((e) => {
        const thirtyDays = new Date();
        thirtyDays.setDate(thirtyDays.getDate() + 30);
        return e.vestingDate <= thirtyDays;
      }).length,
      eventsByType: {
        cliff: vestingEvents.filter((e) => e.eventType === 'cliff').length,
        vesting: vestingEvents.filter((e) => e.eventType === 'vesting').length,
        final: vestingEvents.filter((e) => e.eventType === 'final').length,
      },
    };

    // Group by month for calendar view
    const byMonth: Record<string, VestingEvent[]> = {};
    vestingEvents.forEach((event) => {
      const monthKey = event.vestingDate.toISOString().slice(0, 7); // YYYY-MM
      if (!byMonth[monthKey]) byMonth[monthKey] = [];
      byMonth[monthKey].push(event);
    });

    return NextResponse.json({
      events: vestingEvents,
      summary,
      byMonth,
      daysAhead,
    });
  } catch (error) {
    console.error('Failed to fetch vesting schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vesting schedule' },
      { status: 500 }
    );
  }
}
