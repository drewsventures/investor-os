/**
 * Syndicate Import API
 * POST - Parse and import CSV data from AngelList export
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Parse currency string to number (handles $, commas, EUR€, CAD$, £)
function parseCurrency(value: string | null | undefined): number | null {
  if (!value || value === 'Locked' || value === '' || value === '-') return null;
  // Remove currency symbols, commas, and spaces
  const cleaned = value.replace(/[$€£,\s]|EUR|CAD|C\$/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Parse percentage string to decimal (returns raw percentage, not decimal)
function parsePercentage(value: string | null | undefined): number | null {
  if (!value || value === '' || value === '-') return null;
  const cleaned = value.replace(/%/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num / 100; // Convert 20% to 0.20
}

// Parse date string (MM/DD/YY or MM/DD/YYYY format)
function parseDate(value: string | null | undefined): Date | null {
  if (!value || value === '' || value === '-') return null;
  const parts = value.split('/');
  if (parts.length !== 3) return null;
  const [month, day, yearStr] = parts;
  let year = parseInt(yearStr);
  // Handle 2-digit years
  if (year < 100) {
    year = year > 50 ? 1900 + year : 2000 + year;
  }
  const date = new Date(year, parseInt(month) - 1, parseInt(day));
  return isNaN(date.getTime()) ? null : date;
}

// Parse number of shares (handles commas and decimal points)
function parseShares(value: string | null | undefined): number | null {
  if (!value || value === '' || value === '-') return null;
  const cleaned = value.replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Parse boolean from string
function parseBoolean(value: string | null | undefined): boolean | null {
  if (!value || value === '' || value === '-') return null;
  const v = value.toLowerCase().trim();
  if (v === 'yes' || v === 'true' || v === '1') return true;
  if (v === 'no' || v === 'false' || v === '0') return false;
  return null;
}

// Determine status based on realized/unrealized values
function determineStatus(realizedValue: number | null, unrealizedValue: number | null): 'LIVE' | 'REALIZED' | 'CLOSING' | 'TRANSFERRED' {
  if (realizedValue && realizedValue > 0 && (!unrealizedValue || unrealizedValue === 0)) {
    return 'REALIZED';
  }
  return 'LIVE';
}

// Determine if hosted deal (Red Beard in fund name)
function isHostedDeal(fundName: string | null): boolean {
  if (!fundName) return false;
  return fundName.toLowerCase().includes('red beard');
}

// Map instrument/asset type
function mapInstrument(assetType: string | null | undefined): string | null {
  if (!assetType) return null;
  const t = assetType.toLowerCase().trim();
  if (t.includes('safe')) return 'SAFE';
  if (t.includes('equity')) return 'Equity Round';
  if (t.includes('convertible') || t.includes('debt')) return 'Convertible Debt';
  if (t.includes('saft')) return 'SAFT';
  return assetType;
}

// New CSV format from AngelList
interface NewCSVRow {
  'Startup Name': string;
  'Invest Date': string;
  'Fund Legal Name': string;
  'Stage': string;
  'Market': string;
  'Type': string;
  'Asset Type': string;
  'Share Class': string;
  'Pro Rata Rights': string;
  'Invested Amount (excl. fees)': string;
  'Discount': string;
  'Round Size': string;
  'Valuation or Cap': string;
  'Valuation Type': string;
  'Valuation Updated Date': string;
  'Realized Value': string;
  'Unrealized Value': string;
  'Paid PPS': string;
  'Current PPS': string;
  'Number of Shares': string;
  'Number of LPs': string;
}

// Old CSV format (original import)
interface OldCSVRow {
  'Company/Fund': string;
  'Status': string;
  'Invest Date': string;
  'Invested': string;
  'Unrealized Value': string;
  'Realized Value': string;
  'Net Value': string;
  'Multiple': string;
  'Investment Entity': string;
  'Lead': string;
  'Investment Type': string;
  'Round': string;
  'Market': string;
  'Fund Name': string;
  'Allocation': string;
  'Instrument': string;
  'Round Size': string;
  'Valuation or Cap Type': string;
  'Valuation or Cap': string;
  'Discount': string;
  'Carry': string;
  'Share Class': string;
}

// Detect CSV format based on headers
function isNewFormat(row: Record<string, string>): boolean {
  return 'Startup Name' in row || 'Fund Legal Name' in row;
}

// Process new format row
function processNewFormatRow(row: NewCSVRow) {
  const companyName = row['Startup Name']?.trim();
  const fundName = row['Fund Legal Name']?.trim() || null;
  const realizedValue = parseCurrency(row['Realized Value']);
  const unrealizedValue = parseCurrency(row['Unrealized Value']);

  return {
    companyName,
    market: row['Market'] || null,
    status: determineStatus(realizedValue, unrealizedValue),
    dealType: 'SYNDICATE' as const,
    isHostedDeal: isHostedDeal(fundName),
    investDate: parseDate(row['Invest Date']),
    invested: parseCurrency(row['Invested Amount (excl. fees)']) || 0,
    unrealizedValue,
    realizedValue,
    netValue: null, // Can be calculated: (unrealizedValue || 0) + (realizedValue || 0)
    multiple: null, // Can be calculated from values
    numberOfShares: parseShares(row['Number of Shares']),
    paidPricePerShare: parseCurrency(row['Paid PPS']),
    currentPricePerShare: parseCurrency(row['Current PPS']),
    numberOfLPs: row['Number of LPs'] ? parseInt(row['Number of LPs']) : null,
    investmentEntity: 'Red Beard Ventures', // Default for this sheet
    leadSyndicate: null, // Extracted from fund name if needed
    fundName,
    round: row['Stage'] || null,
    instrument: mapInstrument(row['Asset Type']),
    roundSize: parseCurrency(row['Round Size']),
    allocation: null,
    valuationType: row['Valuation Type'] || null,
    valuation: parseCurrency(row['Valuation or Cap']),
    valuationUpdatedAt: parseDate(row['Valuation Updated Date']),
    discount: parsePercentage(row['Discount']),
    carry: null, // Not in this format
    shareClass: row['Share Class'] || null,
    proRataRights: parseBoolean(row['Pro Rata Rights']),
  };
}

// Process old format row
function processOldFormatRow(row: OldCSVRow) {
  const carry = parsePercentage(row['Carry']);
  const lead = row['Lead'] || '';

  return {
    companyName: row['Company/Fund']?.trim(),
    market: row['Market'] || null,
    status: (row['Status']?.toLowerCase() === 'realized' ? 'REALIZED' : 'LIVE') as 'LIVE' | 'REALIZED',
    dealType: (row['Investment Type']?.toLowerCase() === 'fund' ? 'FUND' : 'SYNDICATE') as 'SYNDICATE' | 'FUND',
    isHostedDeal: lead.toLowerCase().includes('red beard') && (carry === 0 || carry === null),
    investDate: parseDate(row['Invest Date']),
    invested: parseCurrency(row['Invested']) || 0,
    unrealizedValue: parseCurrency(row['Unrealized Value']),
    realizedValue: parseCurrency(row['Realized Value']),
    netValue: parseCurrency(row['Net Value']),
    multiple: parseCurrency(row['Multiple']),
    numberOfShares: null,
    paidPricePerShare: null,
    currentPricePerShare: null,
    numberOfLPs: null,
    investmentEntity: row['Investment Entity'] || '',
    leadSyndicate: lead || null,
    fundName: row['Fund Name'] || null,
    round: row['Round'] || null,
    instrument: row['Instrument']?.toLowerCase() || null,
    roundSize: parseCurrency(row['Round Size']),
    allocation: parseCurrency(row['Allocation']),
    valuationType: row['Valuation or Cap Type'] || null,
    valuation: parseCurrency(row['Valuation or Cap']),
    valuationUpdatedAt: null,
    discount: parsePercentage(row['Discount']),
    carry,
    shareClass: row['Share Class'] || null,
    proRataRights: null,
  };
}

// POST - Import CSV data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows } = body as { rows: Record<string, string>[] };

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json(
        { error: 'Invalid data format. Expected { rows: [...] }' },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      updated: 0,
      errors: [] as string[],
    };

    // Detect format from first row
    const useNewFormat = rows.length > 0 && isNewFormat(rows[0]);

    for (const row of rows) {
      try {
        const data = useNewFormat
          ? processNewFormatRow(row as unknown as NewCSVRow)
          : processOldFormatRow(row as unknown as OldCSVRow);

        if (!data.companyName) {
          results.errors.push('Skipped row with empty company name');
          continue;
        }

        // Check for existing deal by company name and fund name
        const existing = await prisma.syndicateDeal.findFirst({
          where: {
            companyName: data.companyName,
            fundName: data.fundName || undefined,
          },
        });

        if (existing) {
          await prisma.syndicateDeal.update({
            where: { id: existing.id },
            data,
          });
          results.updated++;
        } else {
          await prisma.syndicateDeal.create({ data });
          results.imported++;
        }
      } catch (rowError) {
        const companyName = (row as Record<string, string>)['Startup Name'] || (row as Record<string, string>)['Company/Fund'];
        results.errors.push(
          `Error processing ${companyName}: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      total: results.imported + results.updated,
    });
  } catch (error) {
    console.error('Failed to import syndicate deals:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import deals' },
      { status: 500 }
    );
  }
}
