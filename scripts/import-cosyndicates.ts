/**
 * Import co-syndicate data from CSV
 * Run with: npx ts-node scripts/import-cosyndicates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const csvData = `Companies,Stage,Website,Date of First Outreach,Name of Cosyndicate,Syndicate Link,Carry Received,Notes / Amount of Carry Received,Amount Wired,Round,Round Size,Valuation,Pre or Post
Tripp,Co-Syndicate,https://www.tripp.com/,4/12/2021,Evolutionary Ventures,,Yes,Confirmed with Lauren,,,,,
Deep Sentinel,Co-Syndicate,https://www.deepsentinel.com/,5/19/2021,"Duro Ventures, Slow Ventures, Up2938 (Pierre Omidyar, founder of eBay's fund), and Shasta Ventures.",,Yes,,,,,,
Commsor,Co-Syndicate,https://www.commsor.com/,6/7/2021,Riverside Ventures,,Yes,,,,,,
Bitwage,Co-Syndicate,https://www.bitwage.com/,6/12/2021,Gaingels + Flight,,Yes,,,,,,
KuhMute,Co-Syndicate,https://www.kuhmute.com/,7/19/2021,Futureland Ventures,,Yes,,,,,,
Unocoin,Co-Syndicate,https://unocoin.com/in/,7/27/2021,Gaingels + Flight,,Yes,Asked Gainges; they sent it included Laur / Elana,,,,,
Treasure,Co-promo,https://wearetreasure.co/,7/29/2021,Gaingels,,Yes,,,,,,
Ligandal,Co-Syndicate,https://www.ligandal.com/,8/5/2021,"Social Capital, Esther Dyson, Bioverge, Ripple founder Chris Larson, Skype Founder Jaan Tallinn, and Ethos Investments",,Yes,,,,,,
Ava Labs,Co-Syndicate,https://www.avalabs.org/,8/7/2021,DVC Crypto,,Yes,,,,,,
Coinrule,Co-Syndicate,https://coinrule.com/,8/18/2021,Kube VC,,Yes,,,,,,
Kraken,Co-Syndicate,https://www.kraken.com/en-us/,9/2/2021,Late Stage Ventures,,Yes,,,,,,
Omnislash,Co-Syndicate,https://www.omnislash.com/,9/3/2021,Gaingels,,Yes,,,,,,
Gelatex,Co-Syndicate,https://www.gelatex.com/,9/9/2021,C3,,Yes,,,,,,
Polycade,Co-Syndicate,https://polycade.com/,9/11/2021,Gaingels + Flight,,Yes,,,,,,
Moon,Co-Syndicate,https://paywithmoon.com/,9/13/2021,"Flight/Gaingels, Fenbushi Capital, Fulgur Ventures, Manresa Capital, SBX Capital, and New Form Capital.",,Yes,,,,,,
Elysium Health,Co-Syndicate,https://www.elysiumhealth.com/,9/20/2021,Gaingels + Flight,,Yes,,,,,,
Pearpop,Co-Syndicate,https://pearpop.com/,9/26/2021,Riverside Ventures,,Yes,,,,,,
NopSec,Co-Syndicate,https://www.nopsec.com/,10/5/2021,Gaingels,,Yes,,,,,,
Daanaa,Unsure,https://www.daanaa.com/,10/7/2021,Michael Luciani,,,Follow up with Michael Luciani when he gets back to us,,,,,
SunVessel,Co-Syndicate,https://www.sunvessel.com/,10/8/2021,Gaingels,,Yes,,,,,,
Alt,Co-Syndicate,https://www.onlyalt.com/,10/31/2021,Riverside Ventures,,Yes,Have a side letter with Alex pattis,,,,,
Inrupt,Co-Syndicate,https://inrupt.com/,10/31/2021,Gaingels + Flight,,Yes,,,,,,
SNKRHUD,Co-Promo,https://www.snkrhud.com/,11/4/2021,Gaingels + Flight,,Yes,,,,,,
ZenSports,Co-Syndicate,https://zensports.com/,11/10/2021,"Sand Hill Angels (Omaze, Bolt), Jason Calacanis (Uber, Robinhood), Allied Ventures (Pinterest, Lyft)",,Yes,,,,,,
Cash Live,Co-Syndicate,https://www.cash.live/,11/11/2021,Gaingels and Red Thread Ventures,,Yes,,,,,,
Cohart,Co-Syndicate,https://www.cohart.co/,11/14/2021,Classic Ventures,,Yes,,,,,,
Leia,Co-Syndicate,https://www.leiainc.com/,11/24/2021,Rob Ness,,Yes,,,,,,
Boundary Layer,Co-Syndicate,https://www.boundarylayer.tech/,11/24/2021,Climate Capital,,,,,,,,
CodeLock,Co-Syndicate,https://www.codelocks.us/,11/26/2021,Gaingels + Flight,,Yes,,,,,,
Cyrus,Co-Syndicate,https://cyrus.app/,11/29/2021,Gaingels + Flight,,Yes,,,,,,
Circadian Risk,Co-Syndicate,https://www.circadianrisk.com/,12/3/2021,Gaingels,,Yes,,,,,,
FireSide,Co-Syndicate,https://firesidechat.com/,12/8/2021,First Check Ventures,,Yes,,,,,,
DNABlock,Co-Syndicate,https://www.dnablock.com/,12/10/2021,Gaingels,,Yes,,,,,,
Nerd Street,Co-Syndicate,https://nerdstreet.com/,12/10/2021,Riverside Ventures,,Yes,Received from Alex,$100000,Series A+,$15000000,,
BeatDapp,Co-Syndicate,https://www.beatdapp.com/,12/20/2021,Gaingels,,Yes,,,,,,
CampusWire,Co-Syndicate,https://campuswire.com/,12/21/2021,Spacecadet,,Yes,,,,,,
Blaize,Co-Syndicate,https://www.blaize.com/,12/21/2021,Gaingels + Flight,,Yes,,,,,,
Fourfront,Co-Syndicate,https://www.fourfront.us/,12/23/2021,Riverside Ventures,,Yes,Alex sent it over,$109510,Seed,$5000000,,
Strada,Co-Syndicate,https://stradaeducation.org/,12/23/2021,Gaingels,,Yes,,,,,,
Uplift Labs,Co-Syndicate,https://uplift.ai/,12/23/2021,Gaingels + Flight,,Yes,,,,,,
CommSafe AI,Co-Syndicate,https://commsafe.ai/,12/27/2021,Gaingels,,Yes,,,,,,
Simbe Robotics,Co-Syndicate,https://www.simberobotics.com/,1/5/2022,Gaingels,,Yes,,,,,,
Niftify,Co-Syndicate,https://www.niftify.io/,1/23/2021,Australian Gulf Capital,,Yes,,,,,,
Evaluate.Market,Co-Syndicate,https://evaluate.market/,1/23/2021,Flamingo Capital,,Yes,,,,,,
Tactogen,Co-Syndicate,https://tactogen.com/,1/11/2022,Gaingels,,Yes,,,,,,
Rebis,Co-Syndicate,https://www.rebis.io/,1/19/2022,Gaingels + Flight,,Yes,,,,,,
Bamboo,Co-Syndicate,https://www.getbamboo.io/,2/9/2022,Australian Gulf Capital,,Yes,,,,,,
Red Leader Tech,Co-Syndicate,https://redleadertech.com/,2/20/2022,Gaingels + Flight,,Yes,,,,,,
California Cultured,Co-Syndicate,https://www.cacultured.com/,2/22/2022,C3,,Yes,,,,,,
MeliBio,Co-Syndicate,https://www.melibio.com/,3/1/2022,C3,,Yes,,,,,,
Onchain Studios,Co-Syndicate,https://www.onchainstudios.com/,3/23/2022,Flamingo,,Yes,,,,,,
Jetpack Aviation,Co-Syndicate,https://jetpackaviation.com/,2/27/2022,Gaingels,,Yes,,,,,,
Hyper Food Robotics,Co-Syndicate,https://hyper-robotics.com/,4/6/2022,C3,,Yes,,,,,,
Houwzer,Co-Syndicate,https://houwzer.com/,4/1/2022,Chaos Ventures,,Yes,,,,,,
DXSH,Co-Syndicate,https://dxsh.mv/,5/2/2022,Calm Ventures,,Yes,,,,,,
Swan Bitcoin,Co-Syndicate,https://www.swanbitcoin.com/,5/9/2022,Kube VC,,Yes,,,,,,
ZenLedger,Co-Syndicate,https://www.zenledger.io/,6/1/2022,Calm Ventures,,SAX,,,,,,
Bounty,Co-Syndicate,http://www.bountyusa.com/,6/13/2022,Calm Ventures,,Yes,,,,,,
Rocketplace,Co-Syndicate,https://rocketplace.com/,7/1/2022,W3b.vc & Gaingels,,Yes,,,,,,
Parallel Markets,Co-Syndicate,https://parallelmarkets.com/,7/3/2022,Flight + Gaingels,,Yes,,,,,,
Thrivefantasy,Co-Syndicate,https://thrivefantasy.com/,7/18/2022,Flight + Gaingels + DashAngels,,Yes,,,,,,
Blockbank,Co-Syndicate,https://blockbank.ai/,8/12/2022,Gaingels + Flight,,Yes,,,,,,
Better Brand,Co-Syndicate,https://eatbetter.com/,7/28/2022,Gaingels + Flight,,Yes,,$123000,Series A,$170000000,,
Floor,Co-Syndicate,https://www.floorsusa.com/,7/27/2022,Flamingo,,Yes,,,,,,
Preemo,Co-Syndicate,https://www.preemo.io/,8/19/2022,Riverside Ventures,,Yes,,,,,,
Seashell,Co-Syndicate,https://www.seashell.us/,8/10/2022,Gaingels + Flight,,Yes,,,,,,
Moviepass,Co-Syndicate,https://www.moviepass.com/,8/16/2022,Calm Ventures,,Yes,,,,,,
Data Mynt,Co-Syndicate,https://datamynt.com/,8/24/2022,Gaingels + Flight,,Yes,WENT UNDER,,,,,
End Labs,Co-Syndicate,https://end-labs.io/,8/31/2022,Saxe Cap,,Yes,,,,,,
Asttro,Co-Syndicate,https://asttro.xyz,9/29/2022,Saxe Cap,,Yes,,,,,,
FuzzyBot,Co-Syndicate,https://www.fuzzybot.com/,10/2/2022,Gaingels,,Yes,,,,,,
SciFi Foods,Co-Syndicate,https://scififoods.com/,10/9/2022,Gaingels,,Yes,,,,,,
Calibrate,Co-Syndicate,https://www.joincalibrate.com/,10/12/2022,Mana Ventures,,Yes,,,,,,
Azteco,Co-Syndicate,https://azte.co/,11/20/2022,Gaingels,,Yes,,,,,,
Colossal,Co-Syndicate,https://colossal.com/,1/24/2022,Climate Capital,,Yes,,,,,,
QuickNode,Co-Syndicate,https://www.quicknode.com/,2/3/2022,Flamingo Capital,,Yes,,,,,,
Opal,Co-Syndicate,https://opalcamera.com/,3/8/2023,Jonathan weisserman,,Yes,,,,,,
OnChain Studios,Co-Syndicate,https://www.onchainstudios.com/,3/31/2023,Flamingo Capital,,Yes,,,,,,
Storybook App,Co-Syndicate,https://www.storybook-app.com/en,4/25/2023,Umami Capital,,Yes,,,,,,
StoryCo,Co-Syndicate,https://story.co/,5/17/2023,Calm Ventures,,Yes,,,,,,
Brex,Co-Syndicate,https://brex.com/,5/26/2023,Ventioneers,,Yes,,,,,,
Potion,Co-Syndicate,https://sendpotion.com/,5/29/2023,Gaingels,,Yes,,,,,,
Canza Finance,Co-Syndicate,https://canza.io/,6/5/2023,Calm Ventures,,Yes,,,,,,
Slingshot,Co-Syndicate,https://slingshotaerospace.com/,6/6/2023,Rob Ness,,Yes,,,,,,
Better Brand,Co-Syndicate,https://eatbetter.com/,7/1/2023,Gaingels,,Yes,,$38329.99,Series A+,$5000000,$100000000,
Vimcal,Co-Syndicate,https://www.vimcal.com/,7/2/2023,Gaingels,,Yes,,$103963.38,Pre-seed,$1000000,$25000000,
California Cultured,Co-Syndicate,https://www.cacultured.com/,7/8/2023,Climate Capital,,Yes,,$111300,Seed +,$1500000,,
SpaceX,Co-Syndicate,https://www.spacex.com/,7/10/2023,Tokenfolio,,Yes,1.90%,,,,,
Corvous Robotics,Co-Syndicate,https://www.corvus-robotics.com/,7/15/2023,Rob Ness,,Yes,,,,,,
Thrivefantasy,Co-Syndicate,https://thrivefantasy.com/,7/31/2023,Gaingels,,Yes,,$36000,Series B +,$3000000,$30000000,
FuzzyBot,Co-Syndicate,https://www.fuzzybot.com/,9/10/2023,Gaingels,,Yes,,$25000,Series A,$8000000,$45000000,
National Cycling League,Co-Syndicate,https://nclracing.com/,9/19/2023,Riverside,,Yes,,,Seed+,$4000000,$26500000,
Canva,Co-Syndicate,https://www.canva.com/,10/4/2023,Ventioneers,,Yes,5%,,Secondary,N/A,$25500000000,
Ellipsis Heath,Co-Syndicate,https://www.ellipsishealth.com/,10/5/2023,Gaingels,,Yes,5.77%,$32600,Series A+,$10000000,$95000000,
Cair Health,Co-Syndicate,https://cairhealth.com/,10/9/2023,Exit Fund,,Yes,2%,,Seed,$3000000,$22000000,
Velvet,Co-Syndicate,https://www.velvetfs.com/,10/31/2023,Saxe Cap,,Yes,1.89%,,Seed,$4000000,$20000000,
Liquid Death,Co-Syndicate,https://liquiddeath.com/,11/28/2023,Riverside,,Yes,$9.45 share price / Closed; Just asked 12/6,,Secondary,N/A,,
Lightship,Co-Syndicate,https://lightshiprv.com/,11/29/2023,Climate Capital,,Yes,0.5,$55000,Series B +,$35000000,$98000000,Pre-Money
Moviepass,Co-syndicate,https://www.moviepass.com/,11/30/2023,Calm Ventures,,Yes,1.70%,,Series A,$10000000,$50000000,Pre-Money
Discord,Co-syndicate,https://discord.com/,11/30/2023,Ventioneers,,Yes,1.20%,,Secondary,,,
Kraken,Co-syndicate,https://www.kraken.com/,12/6/2023,Riverside Ventures,,Yes,3.66%,$190000,Secondary,$7.75 p / share,$2100000000,
Sinn Studio,Co-syndicate,https://www.sinnstudio.com/,12/13/2023,Mana Ventures,,Yes,4.40%,,Pre-Seed,$2500000,$9500000,Pre-Money
Wispr,Co-syndicate,https://www.wispr.ai/,12/14/2023,David Goulde,,Yes,1.80%,$128990,Seed +,$10000000,$100000000,Pre-Money
Conception Bio,Co-syndicate,https://conception.bio/,12/15/2023,Jolt VC,,Yes,1.89%,$184350,Series A +,$5000000,$170000000,Post-Money
MultiOn,Co-syndicate,https://multion.ai/,1/2/2024,Calm Ventures,,Yes,1.30%,$53828.38,Seed +,$2000000,$50000000,Post-Money
Minicircle,Co-syndicate,https://minicircle.io/,1/3/2024,Calm Ventures,,Yes,2%,$970000,Seed +,$9000000,$99999000,Post-Money
Aetos Imaging,Co-syndicate,https://aetosimaging.com/,1/15/2024,Mana Ventures,,Yes,10%,,Seed,$5000000,$16000000,Post-Money
Moviepass,Co-syndicate,https://www.moviepass.com/,Second,Calm Ventures,,Yes,6.60%,,Series A,$10000000,$50000000,Pre-Money
Nerd Street,Co-syndicate,https://nerdstreet.com/,2/1/2024,Riverside Ventures,,Yes,6.60%,$66250,Series A+,$2000000,$10000000,Post-Money
Mini Circle,Co-syndicate,https://minicircle.io/,2/28/2024,Calm Ventures,,Yes,6.66%,,,$9000000,$99999000,Post-Money
Spartan Radar,Co-syndicate,https://www.spartanradar.com/,3/1/2024,Calm Ventures,,Yes,6.67%,$100000,Series B+,$24000000,$16000000,Pre-Money
RadAI,Co-syndicate,https://www.radai.com/,3/15/2024,Calm Ventures,,Yes,3.20%,$180000,Series B,$27500000,$275000000,Post-Money
Olipop,Co-syndicate,https://drinkolipop.com/,3/19/2024,Riverside Ventures,,Yes,6.80%,,Secondary,,$857000000,Post-money
Mealme,Co-syndicate,https://www.mealme.ai/,4/4/2024,Calm Ventures,,Yes,Split it 1/3,$30000,Series A,$8000000,$40000000,Post-money
Groq,Co-syndicate,https://groq.com/,4/8/2024,Australian Gulf Capital,,Yes,0.87%,,,,,
D2X,Co-syndicate,https://www.d2x.com/,4/11/2024,Gaingels and Flight,,Still open 1/5,,Series A,$12000000,$57000000,Post-Money
Fanatics,Co-syndicate,https://www.fanatics.com/,4/30/24,Unwritten Capital,,Yes,3.60%,$167245,,,,
Chainalysis,Co-syndicate,https://demo.chainalysis.com/,5/5/2024,Calm Ventures,,Yes,,$1000000,Secondary,,,
Wallaroo,Co-Syndicate,https://wallaroo.ai/,5/7/2024,Exit Fund,,Yes,He raised ~ $23k before we started,,Series A+,$3000000,$85000000,Cap
Anthropic,Co-Syndicate,https://anthropic.com/,5/19/24,Australian Gulf Capital,,Yes,10%,,Series B+,,,
North Inc,Co-Syndicate,https://www.north.inc/,5/20/24,Riverside Ventures,,Yes,10%,$100000,Seed +,$2000000,$12000000,Post-money Cap
Legacy,Co-Syndicate,https://www.givelegacy.com/,5/22/24,Exit Fund,,Yes,1.32%,$93200,Series B+,$5000000,$98000000,Post-money Cap
Psylo,Co-Syndicate,https://psylo.bio/,6/9/24,Calm Ventures,,Yes,6.67,$36200,Seed,$6000000,$26000000,Post-money Cap
Form Bio,Co-Syndicate,https://www.formbio.com/,6/14/24,Calm Ventures,,Yes,1.10%,$74540,Series A+,$22000000,$108000000,Post-money Cap
Gridmatrix,Co-Syndicate,https://www.gridmatrix.com/,6/17/24,Futureland Ventures,,Yes,1/3 with us and daniel goulde,,Seed+,$2000000,$11200000,Post-money Cap
Machina Labs,Co-Syndicate,https://machinalabs.ai/,6/19/24,H.E.N.R.Y Collective,,Yes,2.32%,,Series B+,$10000000,$137000000,Post-money Cap
Bitlayer,Co-Syndicate,https://www.bitlayer.org/,6/25,Mav3 Ventures,,Yes,5.40%,$200000,Series A+,$10000000,,
Antaris Space,Co-Syndicate,https://www.antaris.space/,7/13/2024,Mana Ventures,,Yes,3.50%,$72000,Seed+,$5000000,$80000000,Cap
Anthropic,Co-Syndicate,https://www.anthropic.com/,8/8/24,MyasiaVC,,Yes,7%,,,,,
Loft Orbital,Co-Syndicate,https://www.loftorbital.com/,8/19/24,Riverside Ventures,,Yes,2.14%,$124980,Secondary,,$527000000,Cap
Bluesky,Co-Syndicate,https://bsky.app/,10/3/2024,Riverside Ventures,,Yes,2.15%,$150000,Series A,$15000000,$75000000,Post-money Cap
Firehawk Aerospace,Co-Syndicate,https://firehawkaerospace.com/,10/8/2024,Calm Ventures,,Yes,,,Series C,$50000000,$200000000,Pre-money
Hangout,Co-Syndicate,,10/15/2024,Riverside Ventures,,Yes,10%,$63000,,,,
Delos,Co-Syndicate,https://www.getdelos.com/,10/17/2024,Futureland Ventures,,Yes,40 (futureland) / 60 (RBV),,,,,
Lumina,Co-Syndicate,,11/9/2024,Mana Ventures,,Yes,6.58%,,,,,
Aethero,Co-Syndicate,,11/16/2024,Riverside Ventures,,Yes,5%,$72900,Seed,$5000000,$25000000,Post-money
G8Keep,Co-Syndicate,,11/19/2024,Cinneamhain Ventures,,Yes,50/50 from 60800,,,,$20000000,Post-money
Dejavu,Co-Syndicate,,11/27/2024,Syntax Ventures,,Yes,10%,$85867.20,,,,
Standard Metrics,Co-Syndicate,https://standardmetrics.io/,11/27/2024,Calm Ventures,,Yes,28% from the start,,Series A+,$10000000,$110000000,Cap
Liquid Death,Co-Syndicate,https://liquiddeath.com/,1/27/25,Riverside,,Yes,1/4 from the start,,,,$1030000000,
Arka,Co-Syndicate,https://www.arka.com/,2/20/25,Exitfund,,Yes,50/50 from the start,,Seed,$3000000,,
NXI,Co-Syndicate,https://www.nxi.xyz/,3/4/25,MAV,,Yes,50/50 from the start,$65000,Seed+,$2000000,$15000000,Post-money
New Culture,Co-Syndicate,https://www.newculture.com/,3/14/25,Rob Ness,,Yes,50/50 dollars forward - just asked 3/24,,Series A+,$27000000,$50000000,Pre-money
Rare Candy,Co-Syndicate,https://rarecandy.com/,3/6/25,Mana Ventures,,Yes,50/50 on dollars forward,,Seed,$4000000,$15000000,Post-money
North Inc,Co-Syndicate,https://www.north.cloud/,6/5/25,Riverside Ventures,,Yes,50/50 from the start,,,,,
Charter Space,Co-Syndicate,Charterspace.com,6/12/25,Calm Ventures,,Yes,6.67%,,Seed,$4000000,,
Conception Bio,Co-Syndicate,,8/13/25,Jolt VC,,No,Still open 9/2,,,,,
Base Power,Co-Syndicate,,8/15/25,021 Ventures,,Yes,50/50 on money brought in,,,,,
Kraken,Co-Syndicate,,8/20/25,Riverside Ventures,,Yes,,,,,,`;

// Parse date in MM/DD/YY or MM/DD/YYYY format
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === 'Second' || dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const [month, day, yearStr] = parts;
    let year = parseInt(yearStr);
    if (year < 100) {
      year = year > 50 ? 1900 + year : 2000 + year;
    }
    const date = new Date(year, parseInt(month) - 1, parseInt(day));
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

// Parse currency string
function parseCurrency(value: string): number | null {
  if (!value || value === 'N/A' || value === '') return null;
  const cleaned = value.replace(/[$,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Extract domain from URL
function extractDomain(url: string): string | null {
  if (!url || url === '') return null;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

// Normalize lead syndicate name (map variations to canonical names)
function normalizeLeadSyndicate(lead: string): string {
  if (!lead) return '';

  // Map common variations
  const normalized = lead.trim();

  // Gaingels variations
  if (normalized.match(/gaingels/i)) {
    if (normalized.match(/flight/i)) return 'Gaingels + Flight';
    return 'Gaingels';
  }

  // Riverside variations
  if (normalized.match(/riverside/i)) return 'Riverside Ventures';

  // Calm variations
  if (normalized.match(/calm/i)) return 'Calm Ventures';

  // Climate Capital
  if (normalized.match(/climate/i)) return 'Climate Capital';

  // Flamingo variations
  if (normalized.match(/flamingo/i)) return 'Flamingo Capital';

  // Exit Fund variations
  if (normalized.match(/exit\s*fund/i)) return 'Exit Fund';

  return normalized;
}

async function importCoSyndicates() {
  console.log('Starting co-syndicate import...\n');

  // Parse CSV
  const lines = csvData.split('\n');
  const headers = lines[0].split(',');

  const results = {
    total: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parse (handles basic cases)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const companyName = values[0];
    if (!companyName) continue;

    results.total++;

    const website = values[2] || '';
    const dateStr = values[3] || '';
    const leadSyndicate = normalizeLeadSyndicate(values[4] || '');
    const amountWired = parseCurrency(values[8]);
    const round = values[9] || null;
    const roundSize = parseCurrency(values[10]);
    const valuation = parseCurrency(values[11]);
    const valuationType = values[12] || null;

    try {
      // Check if deal already exists
      const existing = await prisma.syndicateDeal.findFirst({
        where: {
          companyName: {
            equals: companyName,
            mode: 'insensitive',
          },
          isHostedDeal: false,
        },
      });

      const data = {
        companyName,
        companyDomain: extractDomain(website),
        status: 'LIVE' as const,
        dealType: 'SYNDICATE' as const,
        isHostedDeal: false,
        investDate: parseDate(dateStr),
        invested: amountWired || 0,
        leadSyndicate: leadSyndicate || null,
        round,
        roundSize,
        valuation,
        valuationType,
        investmentEntity: 'Drew Austin Greenfeld',
      };

      if (existing) {
        // Update if we have more data
        if (amountWired || round || valuation) {
          await prisma.syndicateDeal.update({
            where: { id: existing.id },
            data,
          });
          results.updated++;
          console.log(`Updated: ${companyName}`);
        } else {
          results.skipped++;
          console.log(`Skipped (exists): ${companyName}`);
        }
      } else {
        await prisma.syndicateDeal.create({ data });
        results.imported++;
        console.log(`Imported: ${companyName} (${leadSyndicate})`);
      }
    } catch (error) {
      results.errors.push(`${companyName}: ${error}`);
      console.error(`Error importing ${companyName}:`, error);
    }
  }

  console.log('\n--- Import Summary ---');
  console.log(`Total rows: ${results.total}`);
  console.log(`Imported: ${results.imported}`);
  console.log(`Updated: ${results.updated}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(e => console.log(`  - ${e}`));
  }

  // Show lead syndicate breakdown
  const breakdown = await prisma.syndicateDeal.groupBy({
    by: ['leadSyndicate'],
    where: { isHostedDeal: false },
    _count: true,
  });

  console.log('\n--- Lead Syndicate Breakdown ---');
  breakdown
    .filter(b => b.leadSyndicate)
    .sort((a, b) => b._count - a._count)
    .forEach(b => {
      console.log(`  ${b.leadSyndicate}: ${b._count} deals`);
    });

  await prisma.$disconnect();
}

importCoSyndicates().catch(console.error);
