/**
 * Update Fund I investments with vesting schedule data
 * Usage: npx tsx scripts/update-fund-vesting.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Vesting schedule data from the spreadsheet
const vestingSchedules: Record<string, {
  launchDate?: string;
  cliffMonths?: number;
  initialReleasePercent?: number;
  vestingPeriodicity?: string;
  vestingPeriods?: number;
  vestingEndDate?: string;
  isLiquid?: boolean;
}> = {
  'Nephos Networks': {
    launchDate: '2024-03-16',
    cliffMonths: 6,
    initialReleasePercent: 10,
    vestingPeriodicity: 'quarterly',
    vestingPeriods: 12,
    vestingEndDate: '2025-09-16',
    isLiquid: true,
  },
  'SAGA Chain': {
    launchDate: '2024-04-09',
    cliffMonths: 3,
    initialReleasePercent: 10,
    vestingPeriodicity: 'monthly',
    vestingPeriods: 12,
    vestingEndDate: '2025-07-09',
    isLiquid: true,
  },
  'Truflation': {
    launchDate: '2024-01-01',
    cliffMonths: 3,
    initialReleasePercent: 10,
    vestingPeriodicity: 'monthly',
    vestingPeriods: 12,
    vestingEndDate: '2025-04-01',
    isLiquid: true,
  },
  'Hytopia': {
    launchDate: '2024-12-01',
    cliffMonths: 3,
    initialReleasePercent: 10,
    vestingPeriodicity: 'monthly',
    vestingPeriods: 12,
    vestingEndDate: '2026-03-01',
    isLiquid: true,
  },
  'Limewire': {
    launchDate: '2024-04-01',
    cliffMonths: 3,
    initialReleasePercent: 10,
    vestingPeriodicity: 'monthly',
    vestingPeriods: 12,
    vestingEndDate: '2025-07-01',
    isLiquid: true,
  },
  'Airstack': {
    launchDate: '2024-07-24',
    cliffMonths: 0,
    initialReleasePercent: 100,
    vestingPeriodicity: 'monthly',
    vestingPeriods: 0,
    isLiquid: true,
  },
  'Peapods': {
    launchDate: '2024-01-01',
    cliffMonths: 0,
    initialReleasePercent: 100,
    vestingPeriodicity: 'monthly',
    vestingPeriods: 0,
    isLiquid: true,
  },
  'Layer3': {
    launchDate: '2024-07-30',
    cliffMonths: 3,
    initialReleasePercent: 10,
    vestingPeriodicity: 'monthly',
    vestingPeriods: 12,
    vestingEndDate: '2025-10-30',
    isLiquid: true,
  },
  'SuperRare': {
    launchDate: '2021-08-18',
    cliffMonths: 0,
    initialReleasePercent: 100,
    vestingPeriodicity: 'monthly',
    vestingPeriods: 0,
    isLiquid: true,
  },
  'Wilder World': {
    launchDate: '2021-05-21',
    cliffMonths: 12,
    initialReleasePercent: 20,
    vestingPeriodicity: 'monthly',
    vestingPeriods: 24,
    vestingEndDate: '2024-05-21',
    isLiquid: true,
  },
  'Wire Network': {
    launchDate: '2025-03-01',
    cliffMonths: 3,
    initialReleasePercent: 10,
    vestingPeriodicity: 'monthly',
    vestingPeriods: 12,
    vestingEndDate: '2026-06-01',
    isLiquid: false,
  },
  'Azuro': {
    launchDate: '2025-02-01',
    cliffMonths: 3,
    initialReleasePercent: 10,
    vestingPeriodicity: 'monthly',
    vestingPeriods: 12,
    vestingEndDate: '2026-05-01',
    isLiquid: false,
  },
  'Zero Tech': {
    launchDate: '2025-03-01',
    cliffMonths: 6,
    initialReleasePercent: 10,
    vestingPeriodicity: 'monthly',
    vestingPeriods: 18,
    vestingEndDate: '2027-03-01',
    isLiquid: false,
  },
  'Minima': {
    launchDate: '2025-01-15',
    cliffMonths: 3,
    initialReleasePercent: 10,
    vestingPeriodicity: 'monthly',
    vestingPeriods: 12,
    vestingEndDate: '2026-04-15',
    isLiquid: false,
  },
  'GUTS International': {
    launchDate: '2024-06-01',
    cliffMonths: 3,
    initialReleasePercent: 10,
    vestingPeriodicity: 'monthly',
    vestingPeriods: 12,
    vestingEndDate: '2025-09-01',
    isLiquid: true,
  },
  'WeatherXM': {
    launchDate: '2025-06-01',
    cliffMonths: 6,
    initialReleasePercent: 15,
    vestingPeriodicity: 'monthly',
    vestingPeriods: 18,
    vestingEndDate: '2027-06-01',
    isLiquid: false,
  },
  'Oortech': {
    launchDate: '2023-09-18',
    cliffMonths: 0,
    initialReleasePercent: 100,
    vestingPeriodicity: 'daily',
    vestingPeriods: 1461,
    vestingEndDate: '2025-09-16',
    isLiquid: true,
  },
  'Lemonade Technologies': {
    launchDate: '2025-06-01',
    cliffMonths: 6,
    initialReleasePercent: 10,
    vestingPeriodicity: 'monthly',
    vestingPeriods: 24,
    vestingEndDate: '2028-06-01',
    isLiquid: false,
  },
};

async function main() {
  console.log('\\n📅 Updating Fund I Vesting Schedules\\n');

  let updated = 0;

  for (const [companyName, schedule] of Object.entries(vestingSchedules)) {
    try {
      const result = await prisma.fundInvestment.updateMany({
        where: { companyName },
        data: {
          launchDate: schedule.launchDate ? new Date(schedule.launchDate) : undefined,
          cliffMonths: schedule.cliffMonths,
          initialReleasePercent: schedule.initialReleasePercent,
          vestingPeriodicity: schedule.vestingPeriodicity,
          vestingPeriods: schedule.vestingPeriods,
          vestingEndDate: schedule.vestingEndDate ? new Date(schedule.vestingEndDate) : undefined,
          isLiquid: schedule.isLiquid,
        },
      });

      if (result.count > 0) {
        console.log(`   ✓ ${companyName}: Updated ${result.count} position(s)`);
        updated += result.count;
      } else {
        console.log(`   ○ ${companyName}: No matching investments found`);
      }
    } catch (error) {
      console.error(`   ✗ ${companyName}: ${error}`);
    }
  }

  console.log('\\n' + '='.repeat(50));
  console.log(`📈 Updated ${updated} investments with vesting schedules`);

  // Show upcoming vesting events
  console.log('\\n📅 Upcoming Vesting Events (next 90 days):');

  const now = new Date();
  const ninetyDays = new Date();
  ninetyDays.setDate(ninetyDays.getDate() + 90);

  const investments = await prisma.fundInvestment.findMany({
    where: {
      vestingEndDate: {
        gte: now,
        lte: ninetyDays,
      },
    },
    orderBy: { vestingEndDate: 'asc' },
  });

  investments.forEach((inv) => {
    console.log(`   • ${inv.companyName} (${inv.tokenName || 'Equity'}): ${inv.vestingEndDate?.toISOString().split('T')[0]}`);
  });

  if (investments.length === 0) {
    console.log('   No vesting events in the next 90 days');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
