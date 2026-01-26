/**
 * Enrich Fund I portfolio companies with AI
 * Usage: npx tsx scripts/enrich-fund-orgs.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic();

const CONFIDENCE_THRESHOLD = 0.7;
const DELAY_BETWEEN_CALLS = 1000;

interface CompanyEnrichment {
  description?: { value: string; confidence: number };
  website?: { value: string; confidence: number };
  industry?: { value: string; confidence: number };
  founded?: { value: number; confidence: number };
  headquarters?: { value: string; confidence: number };
  employeeCount?: { value: string; confidence: number };
  totalRaised?: { value: number; confidence: number };
  notableInvestors?: { value: string[]; confidence: number };
  keyProducts?: { value: string; confidence: number };
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

Return ONLY valid JSON:
{
  "description": { "value": "1-2 sentence company description", "confidence": 0.0 },
  "website": { "value": "https://...", "confidence": 0.0 },
  "industry": { "value": "Industry/sector", "confidence": 0.0 },
  "founded": { "value": 2020, "confidence": 0.0 },
  "headquarters": { "value": "City, State/Country", "confidence": 0.0 },
  "employeeCount": { "value": "11-50", "confidence": 0.0 },
  "totalRaised": { "value": 10000000, "confidence": 0.0 },
  "notableInvestors": { "value": ["Investor 1", "Investor 2"], "confidence": 0.0 },
  "keyProducts": { "value": "Brief description of main products/services", "confidence": 0.0 }
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\\{[\\s\\S]*\\}/);
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
  console.log('\\n🤖 Enriching Fund I Portfolio Companies\\n');

  // Get fund portfolio companies that need enrichment
  const orgsToEnrich = await prisma.organization.findMany({
    where: {
      fundInvestments: { some: {} },
      description: null,
    },
    select: {
      id: true,
      name: true,
      domain: true,
      website: true,
      industry: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`Found ${orgsToEnrich.length} companies to enrich\\n`);

  const results = {
    enriched: 0,
    skipped: 0,
    errors: 0,
  };

  for (const org of orgsToEnrich) {
    console.log(`\\n📊 Processing: ${org.name}`);

    try {
      const enrichment = await researchCompany(org.name, org.domain);

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
        const hq = enrichment.headquarters.value;
        const parts = hq.split(',').map((p: string) => p.trim());
        if (parts.length >= 2) {
          updateData.city = parts[0];
          updateData.country = parts[parts.length - 1];
        }
        console.log(`   ✓ Headquarters (${(enrichment.headquarters.confidence * 100).toFixed(0)}%)`);
      }

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

      if (Object.keys(updateData).length > 0 || facts.length > 0) {
        results.enriched++;

        if (Object.keys(updateData).length > 0) {
          await prisma.organization.update({
            where: { id: org.id },
            data: updateData,
          });
        }

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

        console.log(`   → ${Object.keys(updateData).length} fields updated, ${facts.length} facts added`);
      } else {
        results.skipped++;
        console.log(`   → No high-confidence data found`);
      }

      await sleep(DELAY_BETWEEN_CALLS);
    } catch (error) {
      results.errors++;
      console.error(`   ✗ Error: ${error}`);
    }
  }

  console.log('\\n' + '='.repeat(50));
  console.log('📈 Enrichment Summary:');
  console.log(`   Enriched: ${results.enriched}`);
  console.log(`   Skipped (low confidence): ${results.skipped}`);
  console.log(`   Errors: ${results.errors}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
