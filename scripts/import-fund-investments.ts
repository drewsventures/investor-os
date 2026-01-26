/**
 * Import RBV Fund I investments
 * Usage: npx tsx scripts/import-fund-investments.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fund I portfolio data extracted from Google Sheet
const fundInvestments = [
  // Token/SAFT Investments
  { companyName: 'Lemonade Technologies', nickname: 'Lemonade 1', investmentType: 'TOKEN_SAFT', sector: 'SocialFi', amountInvested: 419553, tokenQuantity: 2295000, currentPrice: 4.00 },
  { companyName: 'Lemonade Technologies', nickname: 'Lemonade 2', investmentType: 'TOKEN_SAFT', sector: 'SocialFi', amountInvested: 80457, tokenQuantity: 3955000 },
  { companyName: 'Zero Tech', tokenName: 'MEOW', investmentType: 'TOKEN_SAFT', sector: 'AI', amountInvested: 1000000, tokenQuantity: 100000000 },
  { companyName: 'Wilder World', tokenName: 'WILD', investmentType: 'TOKEN_SAFT', sector: 'Gaming', amountInvested: 1000000, tokenQuantity: 5000000, currentPrice: 0.20, isLiquid: true },
  { companyName: 'Nephos Networks', nickname: 'Oort', tokenName: 'OORT', investmentType: 'TOKEN_SAFT', sector: 'AI', amountInvested: 500000, tokenQuantity: 33333333, currentPrice: 0.015, isLiquid: true },
  { companyName: 'SAGA Chain', tokenName: 'SAGA', investmentType: 'TOKEN_SAFT', sector: 'Infrastructure', amountInvested: 500000, tokenQuantity: 3846154, currentPrice: 0.13, isLiquid: true },
  { companyName: 'Truflation', tokenName: 'TRUF', investmentType: 'TOKEN_SAFT', sector: 'DeFi', amountInvested: 400000, tokenQuantity: 10000000, currentPrice: 0.25, isLiquid: true },
  { companyName: 'Hytopia', tokenName: 'TOPIA', investmentType: 'TOKEN_SAFT', sector: 'Gaming', amountInvested: 500000, tokenQuantity: 25000000, isLiquid: true },
  { companyName: 'Limewire', nickname: 'Limewire 2', tokenName: 'LMWR', investmentType: 'TOKEN_SAFT', sector: 'AI', amountInvested: 208587, tokenQuantity: 3476288, currentPrice: 0.06, isLiquid: true },
  { companyName: 'GUTS International', nickname: 'Get Protocol 1', tokenName: 'OPN', investmentType: 'TOKEN_SAFT', sector: 'Infrastructure', amountInvested: 796595, tokenQuantity: 133847137, isLiquid: true },
  { companyName: 'Azuro', tokenName: 'AZUR', investmentType: 'TOKEN_SAFT', sector: 'DeFi', amountInvested: 400000, tokenQuantity: 4705882 },
  { companyName: 'Wire Network', tokenName: 'WIRE', investmentType: 'TOKEN_SAFT', sector: 'Infrastructure', amountInvested: 700000, tokenQuantity: 5250000 },
  { companyName: 'Airstack', nickname: 'Moxie 3', tokenName: 'MOXIE', investmentType: 'TOKEN_SAFT', sector: 'SocialFi', amountInvested: 125200, tokenQuantity: 18790424, currentPrice: 0.0067, isLiquid: true },
  { companyName: 'Airstack', nickname: 'Moxie 4', tokenName: 'MOXIE', investmentType: 'TOKEN_SAFT', sector: 'SocialFi', amountInvested: 626750, tokenQuantity: 93929576, currentPrice: 0.0048, isLiquid: true },
  { companyName: 'WeatherXM', nickname: 'WeatherXM 2', tokenName: 'WXM', investmentType: 'TOKEN_SAFT', sector: 'DePIN', amountInvested: 400500, tokenQuantity: 290000 },
  { companyName: 'Peapods', tokenName: 'PEAS', investmentType: 'TOKEN_SAFT', sector: 'DeFi', amountInvested: 1000000, tokenQuantity: 253481, currentPrice: 3.95, isLiquid: true },
  { companyName: 'Minima', tokenName: 'MINIMA', investmentType: 'TOKEN_SAFT', sector: 'Infrastructure', amountInvested: 500000, tokenQuantity: 1500000 },
  { companyName: 'SuperRare', tokenName: 'RARE', investmentType: 'TOKEN_SAFT', sector: 'NFT', amountInvested: 500000, tokenQuantity: 3452186, isLiquid: true },
  { companyName: 'Layer3', tokenName: 'L3', investmentType: 'TOKEN_SAFT', sector: 'Infrastructure', amountInvested: 300000, tokenQuantity: 5000000, isLiquid: true },
  { companyName: 'Knights of Degen', investmentType: 'TOKEN_SAFT', sector: 'Gaming', amountInvested: 250000 },

  // TPA Investments
  { companyName: 'Coinmara', nickname: 'Coinmara 1', tokenName: 'MARA', investmentType: 'TPA', sector: 'DeFi', amountInvested: 0, tokenQuantity: 15820000, currentPrice: 0.00 },
  { companyName: 'Coinmara', nickname: 'Coinmara 2', tokenName: 'MARA', investmentType: 'TPA', sector: 'DeFi', amountInvested: 0, tokenQuantity: 9180000, currentPrice: 0.00 },

  // Equity Investments
  { companyName: 'Gateway', investmentType: 'EQUITY', sector: 'AI', amountInvested: 50000, equityValue: 33786 },
  { companyName: 'Stationhead', investmentType: 'EQUITY', sector: 'Consumer', amountInvested: 250000 },
  { companyName: 'Belay', investmentType: 'EQUITY', sector: 'DeFi', amountInvested: 600000 },
  { companyName: 'Heights Labs', investmentType: 'EQUITY', sector: 'Consumer', amountInvested: 900000 },
  { companyName: 'Alexandria Labs', investmentType: 'EQUITY', sector: 'AI', amountInvested: 500000 },
  { companyName: 'Immersve', investmentType: 'EQUITY', sector: 'Infrastructure', amountInvested: 500000 },
  { companyName: 'Popchew', investmentType: 'EQUITY', sector: 'Consumer', amountInvested: 250000 },
  { companyName: 'Noramp', investmentType: 'EQUITY', sector: 'DeFi', amountInvested: 300000 },
  { companyName: 'Moxie', investmentType: 'EQUITY', sector: 'SocialFi', amountInvested: 200000 },
  { companyName: 'Oortech', nickname: 'OORT', tokenName: 'OORT', investmentType: 'TOKEN_SAFT', sector: 'AI', amountInvested: 76560, tokenQuantity: 5104000, isLiquid: true },
];

async function main() {
  console.log('\\n📊 Importing RBV Fund I Investments\\n');
  console.log(`Total investments to import: ${fundInvestments.length}\\n`);

  const results = {
    created: 0,
    updated: 0,
    errors: [] as string[],
  };

  for (const inv of fundInvestments) {
    try {
      // Calculate values
      const tokenValue = inv.tokenQuantity && inv.currentPrice
        ? inv.tokenQuantity * inv.currentPrice
        : null;
      const totalValue = (tokenValue || 0) + (inv.equityValue || 0);

      // Check for existing
      const existing = await prisma.fundInvestment.findFirst({
        where: {
          fundName: 'Red Beard Ventures Fund I LP',
          companyName: inv.companyName,
          nickname: inv.nickname || null,
        },
      });

      const data = {
        fundName: 'Red Beard Ventures Fund I LP',
        companyName: inv.companyName,
        nickname: inv.nickname || null,
        investmentType: inv.investmentType as 'TOKEN_SAFT' | 'EQUITY' | 'TPA' | 'WARRANT',
        sector: inv.sector,
        amountInvested: inv.amountInvested,
        tokenName: inv.tokenName || null,
        tokenQuantity: inv.tokenQuantity || null,
        currentPrice: inv.currentPrice || null,
        tokenValue: tokenValue,
        equityValue: inv.equityValue || null,
        totalValue: totalValue || null,
        isLiquid: inv.isLiquid || false,
        lastPriceUpdate: inv.currentPrice ? new Date() : null,
      };

      if (existing) {
        await prisma.fundInvestment.update({
          where: { id: existing.id },
          data,
        });
        console.log(`   ✓ Updated: ${inv.companyName}${inv.nickname ? ` (${inv.nickname})` : ''}`);
        results.updated++;
      } else {
        await prisma.fundInvestment.create({ data });
        console.log(`   ✓ Created: ${inv.companyName}${inv.nickname ? ` (${inv.nickname})` : ''}`);
        results.created++;
      }
    } catch (error) {
      console.error(`   ✗ Error: ${inv.companyName} - ${error}`);
      results.errors.push(`${inv.companyName}: ${error}`);
    }
  }

  console.log('\\n' + '='.repeat(50));
  console.log('📈 Import Summary:');
  console.log(`   Created: ${results.created}`);
  console.log(`   Updated: ${results.updated}`);
  console.log(`   Errors: ${results.errors.length}`);

  // Create initial fund metrics snapshot
  console.log('\\n📊 Creating fund metrics snapshot...');

  const allInvestments = await prisma.fundInvestment.findMany({
    where: { fundName: 'Red Beard Ventures Fund I LP' },
  });

  const totals = allInvestments.reduce(
    (acc, inv) => {
      acc.invested += Number(inv.amountInvested) || 0;
      acc.tokenValue += Number(inv.tokenValue) || 0;
      acc.equityValue += Number(inv.equityValue) || 0;
      acc.totalValue += Number(inv.totalValue) || Number(inv.tokenValue) || Number(inv.equityValue) || 0;
      acc.liquidBalance += inv.isLiquid ? (Number(inv.tokenValue) || 0) : 0;
      if (inv.investmentType === 'TOKEN_SAFT' || inv.investmentType === 'TPA') {
        if (inv.isLiquid) acc.tokensLive++;
      }
      return acc;
    },
    { invested: 0, tokenValue: 0, equityValue: 0, totalValue: 0, liquidBalance: 0, tokensLive: 0 }
  );

  const tvpi = totals.invested > 0 ? totals.totalValue / totals.invested : 0;

  await prisma.fundMetric.upsert({
    where: {
      fundName_snapshotDate: {
        fundName: 'Red Beard Ventures Fund I LP',
        snapshotDate: new Date(new Date().toISOString().split('T')[0]),
      },
    },
    update: {
      totalInvested: totals.invested,
      tokenValue: totals.tokenValue,
      equityValue: totals.equityValue,
      totalPortfolioValue: totals.totalValue,
      liquidBalance: totals.liquidBalance,
      nonLiquidBalance: totals.totalValue - totals.liquidBalance,
      liquidPercent: totals.totalValue > 0 ? (totals.liquidBalance / totals.totalValue) * 100 : 0,
      tvpiMultiple: tvpi,
      totalInvestments: allInvestments.length,
      tokensLive: totals.tokensLive,
    },
    create: {
      fundName: 'Red Beard Ventures Fund I LP',
      snapshotDate: new Date(new Date().toISOString().split('T')[0]),
      totalInvested: totals.invested,
      tokenValue: totals.tokenValue,
      equityValue: totals.equityValue,
      totalPortfolioValue: totals.totalValue,
      liquidBalance: totals.liquidBalance,
      nonLiquidBalance: totals.totalValue - totals.liquidBalance,
      liquidPercent: totals.totalValue > 0 ? (totals.liquidBalance / totals.totalValue) * 100 : 0,
      tvpiMultiple: tvpi,
      totalInvestments: allInvestments.length,
      tokensLive: totals.tokensLive,
    },
  });

  console.log('   ✓ Fund metrics snapshot created');
  console.log(`\\n   Total Invested: $${(totals.invested / 1000000).toFixed(2)}M`);
  console.log(`   Portfolio Value: $${(totals.totalValue / 1000000).toFixed(2)}M`);
  console.log(`   TVPI: ${tvpi.toFixed(2)}x`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
