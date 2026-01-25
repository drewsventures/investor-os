/**
 * Batch enrich organizations with AI-researched data
 * Usage: npx tsx scripts/enrich-organizations.ts [--limit N] [--dry-run]
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic();

const CONFIDENCE_THRESHOLD = 0.7;
const DELAY_BETWEEN_CALLS = 1000; // 1 second delay to avoid rate limits

interface CompanyEnrichment {
  description?: { value: string; confidence: number };
  website?: { value: string; confidence: number };
  industry?: { value: string; confidence: number };
  founded?: { value: number; confidence: number };
  headquarters?: { value: string; confidence: number };
  employeeCount?: { value: string; confidence: number };
  totalRaised?: { value: number; confidence: number };
  lastRoundAmount?: { value: number; confidence: number };
  lastRoundType?: { value: string; confidence: number };
  lastRoundDate?: { value: string; confidence: number };
  notableInvestors?: { value: string[]; confidence: number };
  keyProducts?: { value: string; confidence: number };
  competitors?: { value: string[]; confidence: number };
  recentNews?: { value: string; confidence: number };
}

async function researchCompany(companyName: string, domain: string | null): Promise<CompanyEnrichment> {
  const prompt = `You are a research assistant helping to gather accurate information about a startup/company for an investor database.

Company: ${companyName}
${domain ? `Domain: ${domain}` : ''}

Research this company and provide information in the following JSON format. For each field, provide:
- "value": the information (use null if unknown)
- "confidence": a number from 0 to 1 indicating how confident you are in this information

Be conservative with confidence scores:
- 0.9-1.0: You are certain this is accurate (well-known public information)
- 0.7-0.89: You are fairly confident (from reliable sources)
- 0.5-0.69: You think this is likely correct but have some uncertainty
- Below 0.5: You are guessing or the information is unclear

If you cannot find reliable information about a field, use null for value and 0 for confidence.

Return ONLY valid JSON in this exact format:
{
  "description": { "value": "1-2 sentence company description", "confidence": 0.0 },
  "website": { "value": "https://...", "confidence": 0.0 },
  "industry": { "value": "Industry/sector", "confidence": 0.0 },
  "founded": { "value": 2020, "confidence": 0.0 },
  "headquarters": { "value": "City, State/Country", "confidence": 0.0 },
  "employeeCount": { "value": "11-50", "confidence": 0.0 },
  "totalRaised": { "value": 10000000, "confidence": 0.0 },
  "lastRoundAmount": { "value": 5000000, "confidence": 0.0 },
  "lastRoundType": { "value": "Series A", "confidence": 0.0 },
  "lastRoundDate": { "value": "2024-01", "confidence": 0.0 },
  "notableInvestors": { "value": ["Investor 1", "Investor 2"], "confidence": 0.0 },
  "keyProducts": { "value": "Brief description of main products/services", "confidence": 0.0 },
  "competitors": { "value": ["Competitor 1", "Competitor 2"], "confidence": 0.0 },
  "recentNews": { "value": "Brief summary of recent notable news or developments", "confidence": 0.0 }
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    return JSON.parse(jsonMatch[0]) as CompanyEnrichment;
  } catch (error) {
    console.error(`Error researching ${companyName}:`, error);
    return {};
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit'));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] || '10') : 10;

  console.log(`\n🔍 Enrichment Settings:`);
  console.log(`   Limit: ${limit} organizations`);
  console.log(`   Dry run: ${dryRun}`);
  console.log(`   Confidence threshold: ${CONFIDENCE_THRESHOLD}`);
  console.log('');

  // Find organizations from syndicate deals that need enrichment
  const orgsToEnrich = await prisma.organization.findMany({
    where: {
      description: null,
      syndicateDeals: { some: {} },
    },
    select: {
      id: true,
      name: true,
      domain: true,
      industry: true,
      website: true,
    },
    take: limit,
    orderBy: { name: 'asc' },
  });

  console.log(`Found ${orgsToEnrich.length} organizations to enrich\n`);

  const results = {
    processed: 0,
    enriched: 0,
    skipped: 0,
    errors: 0,
  };

  for (const org of orgsToEnrich) {
    console.log(`\n📊 Processing: ${org.name}`);

    try {
      const enrichment = await researchCompany(org.name, org.domain);
      results.processed++;

      // Collect high confidence updates
      const updateData: Record<string, unknown> = {};
      const facts: string[] = [];

      if (enrichment.description?.confidence && enrichment.description.confidence >= CONFIDENCE_THRESHOLD) {
        updateData.description = enrichment.description.value;
        console.log(`   ✓ Description (${(enrichment.description.confidence * 100).toFixed(0)}%)`);
      }

      if (enrichment.website?.confidence && enrichment.website.confidence >= CONFIDENCE_THRESHOLD && !org.website) {
        updateData.website = enrichment.website.value;
        console.log(`   ✓ Website (${(enrichment.website.confidence * 100).toFixed(0)}%)`);
      }

      if (enrichment.industry?.confidence && enrichment.industry.confidence >= CONFIDENCE_THRESHOLD && !org.industry) {
        updateData.industry = enrichment.industry.value;
        console.log(`   ✓ Industry (${(enrichment.industry.confidence * 100).toFixed(0)}%)`);
      }

      if (enrichment.headquarters?.confidence && enrichment.headquarters.confidence >= CONFIDENCE_THRESHOLD) {
        // Parse headquarters into city/country
        const hq = enrichment.headquarters.value;
        const parts = hq.split(',').map((p: string) => p.trim());
        if (parts.length >= 2) {
          updateData.city = parts[0];
          updateData.country = parts[parts.length - 1];
        }
        console.log(`   ✓ Headquarters (${(enrichment.headquarters.confidence * 100).toFixed(0)}%)`);
      }

      if (enrichment.employeeCount?.confidence && enrichment.employeeCount.confidence >= CONFIDENCE_THRESHOLD) {
        updateData.employeeRange = enrichment.employeeCount.value;
        console.log(`   ✓ Employee count (${(enrichment.employeeCount.confidence * 100).toFixed(0)}%)`);
      }

      // Facts to create
      if (enrichment.totalRaised?.confidence && enrichment.totalRaised.confidence >= CONFIDENCE_THRESHOLD) {
        facts.push(`Total raised: $${(enrichment.totalRaised.value / 1000000).toFixed(1)}M`);
        console.log(`   ✓ Total raised (${(enrichment.totalRaised.confidence * 100).toFixed(0)}%)`);
      }

      if (enrichment.notableInvestors?.confidence && enrichment.notableInvestors.confidence >= CONFIDENCE_THRESHOLD) {
        facts.push(`Investors: ${enrichment.notableInvestors.value.join(', ')}`);
        console.log(`   ✓ Investors (${(enrichment.notableInvestors.confidence * 100).toFixed(0)}%)`);
      }

      if (enrichment.keyProducts?.confidence && enrichment.keyProducts.confidence >= CONFIDENCE_THRESHOLD) {
        facts.push(`Products: ${enrichment.keyProducts.value}`);
        console.log(`   ✓ Products (${(enrichment.keyProducts.confidence * 100).toFixed(0)}%)`);
      }

      // Log low confidence items
      for (const [key, data] of Object.entries(enrichment)) {
        if (data && typeof data === 'object' && 'confidence' in data) {
          if (data.confidence > 0 && data.confidence < CONFIDENCE_THRESHOLD) {
            console.log(`   ○ ${key} skipped (${((data.confidence as number) * 100).toFixed(0)}% < ${CONFIDENCE_THRESHOLD * 100}%)`);
          }
        }
      }

      if (Object.keys(updateData).length > 0 || facts.length > 0) {
        results.enriched++;

        if (!dryRun) {
          // Update organization
          if (Object.keys(updateData).length > 0) {
            await prisma.organization.update({
              where: { id: org.id },
              data: updateData,
            });
          }

          // Create facts
          for (const factContent of facts) {
            const factType = factContent.startsWith('Total raised') ? 'FUNDING'
              : factContent.startsWith('Investors') ? 'INVESTORS'
              : 'PRODUCT';
            const key = factContent.startsWith('Total raised') ? 'total_raised'
              : factContent.startsWith('Investors') ? 'notable_investors'
              : 'products';

            await prisma.fact.create({
              data: {
                organizationId: org.id,
                factType,
                key,
                value: factContent,
                confidence: 0.8,
                sourceType: 'AI_ENRICHMENT',
              },
            });
          }
        }

        console.log(`   → ${Object.keys(updateData).length} fields updated, ${facts.length} facts added`);
      } else {
        results.skipped++;
        console.log(`   → No high-confidence data found`);
      }

      // Rate limiting
      await sleep(DELAY_BETWEEN_CALLS);

    } catch (error) {
      results.errors++;
      console.error(`   ✗ Error: ${error}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📈 Summary:');
  console.log(`   Processed: ${results.processed}`);
  console.log(`   Enriched: ${results.enriched}`);
  console.log(`   Skipped (low confidence): ${results.skipped}`);
  console.log(`   Errors: ${results.errors}`);
  if (dryRun) {
    console.log('\n   ⚠️  DRY RUN - no changes were saved');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
