/**
 * Fund Investment Import API
 * Import fund investments from JSON data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface FundImportRow {
  companyName: string;
  nickname?: string;
  investmentType?: string;
  sector?: string;
  amountInvested: number;
  investmentDate?: string;
  tokenName?: string;
  tokenQuantity?: number;
  currentPrice?: number;
  equityValue?: number;
  launchDate?: string;
  cliffMonths?: number;
  initialReleasePercent?: number;
  vestingPeriodicity?: string;
  vestingPeriods?: number;
  vestingEndDate?: string;
  isLiquid?: boolean;
  realizedValue?: number;
  realizedPercent?: number;
  notes?: string;
}

// POST - Import fund investments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { investments, fundName = 'Red Beard Ventures Fund I LP' } = body as {
      investments: FundImportRow[];
      fundName?: string;
    };

    if (!investments || !Array.isArray(investments)) {
      return NextResponse.json(
        { error: 'investments array is required' },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const row of investments) {
      try {
        if (!row.companyName || row.amountInvested === undefined) {
          results.errors.push(`Missing required fields for: ${row.companyName || 'unknown'}`);
          continue;
        }

        // Map investment type
        let investmentType: 'TOKEN_SAFT' | 'EQUITY' | 'TPA' | 'WARRANT' = 'TOKEN_SAFT';
        if (row.investmentType) {
          const typeMap: Record<string, 'TOKEN_SAFT' | 'EQUITY' | 'TPA' | 'WARRANT'> = {
            'Token/SAFT': 'TOKEN_SAFT',
            'TOKEN_SAFT': 'TOKEN_SAFT',
            'SAFT': 'TOKEN_SAFT',
            'Token': 'TOKEN_SAFT',
            'Equity': 'EQUITY',
            'EQUITY': 'EQUITY',
            'TPA': 'TPA',
            'WARRANT': 'WARRANT',
            'Warrant': 'WARRANT',
          };
          investmentType = typeMap[row.investmentType] || 'TOKEN_SAFT';
        }

        // Calculate token value
        const tokenValue = row.tokenQuantity && row.currentPrice
          ? row.tokenQuantity * row.currentPrice
          : null;
        const totalValue = (tokenValue || 0) + (row.equityValue || 0);

        // Check if investment already exists
        const existing = await prisma.fundInvestment.findFirst({
          where: {
            fundName,
            companyName: row.companyName,
            tokenName: row.tokenName || null,
          },
        });

        if (existing) {
          // Update existing
          await prisma.fundInvestment.update({
            where: { id: existing.id },
            data: {
              nickname: row.nickname || existing.nickname,
              investmentType,
              sector: row.sector || existing.sector,
              amountInvested: row.amountInvested,
              investmentDate: row.investmentDate ? new Date(row.investmentDate) : existing.investmentDate,
              tokenName: row.tokenName || existing.tokenName,
              tokenQuantity: row.tokenQuantity ?? existing.tokenQuantity,
              currentPrice: row.currentPrice ?? existing.currentPrice,
              tokenValue: tokenValue ?? existing.tokenValue,
              equityValue: row.equityValue ?? existing.equityValue,
              totalValue: totalValue || existing.totalValue,
              launchDate: row.launchDate ? new Date(row.launchDate) : existing.launchDate,
              cliffMonths: row.cliffMonths ?? existing.cliffMonths,
              initialReleasePercent: row.initialReleasePercent ?? existing.initialReleasePercent,
              vestingPeriodicity: row.vestingPeriodicity || existing.vestingPeriodicity,
              vestingPeriods: row.vestingPeriods ?? existing.vestingPeriods,
              vestingEndDate: row.vestingEndDate ? new Date(row.vestingEndDate) : existing.vestingEndDate,
              isLiquid: row.isLiquid ?? existing.isLiquid,
              realizedValue: row.realizedValue ?? existing.realizedValue,
              realizedPercent: row.realizedPercent ?? existing.realizedPercent,
              notes: row.notes || existing.notes,
              lastPriceUpdate: row.currentPrice ? new Date() : existing.lastPriceUpdate,
            },
          });
          results.updated++;
        } else {
          // Create new
          await prisma.fundInvestment.create({
            data: {
              fundName,
              companyName: row.companyName,
              nickname: row.nickname,
              investmentType,
              sector: row.sector,
              amountInvested: row.amountInvested,
              investmentDate: row.investmentDate ? new Date(row.investmentDate) : null,
              tokenName: row.tokenName,
              tokenQuantity: row.tokenQuantity,
              currentPrice: row.currentPrice,
              tokenValue,
              equityValue: row.equityValue,
              totalValue: totalValue || null,
              launchDate: row.launchDate ? new Date(row.launchDate) : null,
              cliffMonths: row.cliffMonths,
              initialReleasePercent: row.initialReleasePercent,
              vestingPeriodicity: row.vestingPeriodicity,
              vestingPeriods: row.vestingPeriods,
              vestingEndDate: row.vestingEndDate ? new Date(row.vestingEndDate) : null,
              isLiquid: row.isLiquid ?? false,
              realizedValue: row.realizedValue,
              realizedPercent: row.realizedPercent,
              notes: row.notes,
              lastPriceUpdate: row.currentPrice ? new Date() : null,
            },
          });
          results.created++;
        }
      } catch (err) {
        results.errors.push(`Error processing ${row.companyName}: ${err}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      total: investments.length,
    });
  } catch (error) {
    console.error('Failed to import fund investments:', error);
    return NextResponse.json(
      { error: 'Failed to import fund investments' },
      { status: 500 }
    );
  }
}
