/**
 * Deal Analytics API
 * GET - Get deal pipeline analytics, patterns, and trends
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get all deals with stage history
    const deals = await prisma.deal.findMany({
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            industry: true,
          }
        },
        stageHistory: {
          orderBy: { transitionDate: 'asc' }
        }
      }
    });

    // Calculate stage distribution
    const stageDistribution = deals.reduce((acc, deal) => {
      acc[deal.stage] = (acc[deal.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate conversion rates between stages
    const stageTransitions: Record<string, Record<string, number>> = {};
    const allHistory = await prisma.dealStageHistory.findMany({
      orderBy: { transitionDate: 'asc' }
    });

    for (const h of allHistory) {
      if (h.fromStage) {
        if (!stageTransitions[h.fromStage]) {
          stageTransitions[h.fromStage] = {};
        }
        stageTransitions[h.fromStage][h.toStage] = (stageTransitions[h.fromStage][h.toStage] || 0) + 1;
      }
    }

    // Calculate average time in each stage
    const timeInStage: Record<string, number[]> = {};
    for (const h of allHistory) {
      if (h.fromStage && h.daysInPreviousStage) {
        if (!timeInStage[h.fromStage]) {
          timeInStage[h.fromStage] = [];
        }
        timeInStage[h.fromStage].push(h.daysInPreviousStage);
      }
    }

    const avgTimeInStage: Record<string, number> = {};
    for (const [stage, days] of Object.entries(timeInStage)) {
      avgTimeInStage[stage] = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
    }

    // Calculate pass rate by industry
    const industryStats: Record<string, { total: number; passed: number; portfolio: number }> = {};
    for (const deal of deals) {
      const industry = deal.organization.industry || 'Unknown';
      if (!industryStats[industry]) {
        industryStats[industry] = { total: 0, passed: 0, portfolio: 0 };
      }
      industryStats[industry].total++;
      if (deal.stage === 'PASSED') industryStats[industry].passed++;
      if (deal.stage === 'PORTFOLIO') industryStats[industry].portfolio++;
    }

    // Calculate source channel effectiveness
    const sourceStats: Record<string, { total: number; passed: number; portfolio: number }> = {};
    for (const deal of deals) {
      const source = deal.sourceChannel || 'Unknown';
      if (!sourceStats[source]) {
        sourceStats[source] = { total: 0, passed: 0, portfolio: 0 };
      }
      sourceStats[source].total++;
      if (deal.stage === 'PASSED') sourceStats[source].passed++;
      if (deal.stage === 'PORTFOLIO') sourceStats[source].portfolio++;
    }

    // Calculate referral source effectiveness
    const referralStats: Record<string, { total: number; passed: number; portfolio: number }> = {};
    for (const deal of deals) {
      const referral = deal.referralSource || null;
      if (referral) {
        if (!referralStats[referral]) {
          referralStats[referral] = { total: 0, passed: 0, portfolio: 0 };
        }
        referralStats[referral].total++;
        if (deal.stage === 'PASSED') referralStats[referral].passed++;
        if (deal.stage === 'PORTFOLIO') referralStats[referral].portfolio++;
      }
    }

    // Calculate funnel metrics
    const totalDeals = deals.length;
    const passedDeals = deals.filter(d => d.stage === 'PASSED').length;
    const portfolioDeals = deals.filter(d => d.stage === 'PORTFOLIO').length;
    const activeDeals = deals.filter(d => !['PASSED', 'PORTFOLIO'].includes(d.stage)).length;

    // Deals by month (created)
    const dealsByMonth: Record<string, number> = {};
    for (const deal of deals) {
      const month = new Date(deal.createdAt).toISOString().slice(0, 7); // YYYY-MM
      dealsByMonth[month] = (dealsByMonth[month] || 0) + 1;
    }

    // Top referral sources
    const topReferrals = Object.entries(referralStats)
      .map(([name, stats]) => ({
        name,
        ...stats,
        successRate: stats.portfolio / stats.total
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return NextResponse.json({
      overview: {
        totalDeals,
        activeDeals,
        passedDeals,
        portfolioDeals,
        conversionRate: totalDeals > 0 ? (portfolioDeals / totalDeals * 100).toFixed(1) : 0,
        passRate: totalDeals > 0 ? (passedDeals / totalDeals * 100).toFixed(1) : 0,
      },
      stageDistribution,
      stageTransitions,
      avgTimeInStage,
      industryStats: Object.entries(industryStats)
        .map(([industry, stats]) => ({
          industry,
          ...stats,
          passRate: ((stats.passed / stats.total) * 100).toFixed(1),
          successRate: ((stats.portfolio / stats.total) * 100).toFixed(1),
        }))
        .sort((a, b) => b.total - a.total),
      sourceStats: Object.entries(sourceStats)
        .map(([source, stats]) => ({
          source,
          ...stats,
          passRate: ((stats.passed / stats.total) * 100).toFixed(1),
          successRate: ((stats.portfolio / stats.total) * 100).toFixed(1),
        }))
        .sort((a, b) => b.total - a.total),
      topReferrals,
      dealsByMonth: Object.entries(dealsByMonth)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    });
  } catch (error) {
    console.error('Failed to fetch deal analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deal analytics', details: String(error) },
      { status: 500 }
    );
  }
}
