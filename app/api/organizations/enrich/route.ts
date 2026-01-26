/**
 * Organization Enrichment API
 * Uses Claude to research and enrich company information
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const anthropic = new Anthropic();

// Minimum confidence threshold (0-1) to save data
const CONFIDENCE_THRESHOLD = 0.7;

interface EnrichmentResult {
  field: string;
  value: string | number | null;
  confidence: number;
  source?: string;
}

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

// POST - Enrich a specific organization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, dryRun = false } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Get the organization
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        syndicateDeals: {
          take: 1,
          orderBy: { investDate: 'desc' }
        }
      }
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Use Claude to research the company
    const enrichment = await researchCompany(org.name, org.domain);

    // Filter by confidence threshold
    const highConfidenceData: Record<string, unknown> = {};
    const allResults: EnrichmentResult[] = [];

    for (const [field, data] of Object.entries(enrichment)) {
      if (data && typeof data === 'object' && 'value' in data && 'confidence' in data) {
        allResults.push({
          field,
          value: data.value as string | number | null,
          confidence: data.confidence as number,
        });

        if ((data.confidence as number) >= CONFIDENCE_THRESHOLD && data.value) {
          highConfidenceData[field] = data.value;
        }
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (highConfidenceData.description && !org.description) {
      updateData.description = highConfidenceData.description;
    }
    if (highConfidenceData.website && !org.website) {
      updateData.website = highConfidenceData.website;
    }
    if (highConfidenceData.industry && !org.industry) {
      updateData.industry = highConfidenceData.industry;
    }
    if (highConfidenceData.headquarters) {
      // Parse headquarters into city/country if possible
      const hq = highConfidenceData.headquarters as string;
      const parts = hq.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        updateData.city = parts[0];
        updateData.country = parts[parts.length - 1];
      }
    }
    // Save facts for additional data
    const factsToCreate: Array<{
      organizationId: string;
      factType: string;
      key: string;
      value: string;
      confidence: number;
      sourceType: string;
    }> = [];

    // Employee count stored as a fact (no field in Organization model)
    if (highConfidenceData.employeeCount) {
      factsToCreate.push({
        organizationId: org.id,
        factType: 'COMPANY_INFO',
        key: 'employee_count',
        value: highConfidenceData.employeeCount as string,
        confidence: enrichment.employeeCount?.confidence || 0.7,
        sourceType: 'AI_ENRICHMENT',
      });
    }

    if (highConfidenceData.totalRaised) {
      factsToCreate.push({
        organizationId: org.id,
        factType: 'FUNDING',
        key: 'total_raised',
        value: JSON.stringify({ amount: highConfidenceData.totalRaised, formatted: `$${((highConfidenceData.totalRaised as number) / 1000000).toFixed(1)}M` }),
        confidence: enrichment.totalRaised?.confidence || 0.7,
        sourceType: 'AI_ENRICHMENT',
      });
    }

    if (highConfidenceData.notableInvestors && Array.isArray(highConfidenceData.notableInvestors)) {
      factsToCreate.push({
        organizationId: org.id,
        factType: 'INVESTORS',
        key: 'notable_investors',
        value: JSON.stringify(highConfidenceData.notableInvestors),
        confidence: enrichment.notableInvestors?.confidence || 0.7,
        sourceType: 'AI_ENRICHMENT',
      });
    }

    if (highConfidenceData.keyProducts) {
      factsToCreate.push({
        organizationId: org.id,
        factType: 'PRODUCT',
        key: 'products',
        value: highConfidenceData.keyProducts as string,
        confidence: enrichment.keyProducts?.confidence || 0.7,
        sourceType: 'AI_ENRICHMENT',
      });
    }

    if (highConfidenceData.recentNews) {
      factsToCreate.push({
        organizationId: org.id,
        factType: 'NEWS',
        key: 'recent_news',
        value: highConfidenceData.recentNews as string,
        confidence: enrichment.recentNews?.confidence || 0.7,
        sourceType: 'AI_ENRICHMENT',
      });
    }

    let factsCreated = 0;

    if (!dryRun) {
      // Update organization
      if (Object.keys(updateData).length > 0) {
        await prisma.organization.update({
          where: { id: org.id },
          data: updateData,
        });
      }

      // Create facts
      for (const fact of factsToCreate) {
        // Check if similar fact already exists
        const existing = await prisma.fact.findFirst({
          where: {
            organizationId: org.id,
            factType: fact.factType,
            validUntil: null,
          },
        });

        if (!existing) {
          await prisma.fact.create({ data: fact });
          factsCreated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      organization: {
        id: org.id,
        name: org.name,
      },
      enrichment: allResults,
      highConfidenceCount: Object.keys(highConfidenceData).length,
      fieldsUpdated: Object.keys(updateData),
      factsCreated: dryRun ? factsToCreate.length : factsCreated,
      confidenceThreshold: CONFIDENCE_THRESHOLD,
    });
  } catch (error) {
    console.error('Failed to enrich organization:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enrich organization' },
      { status: 500 }
    );
  }
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

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const enrichment = JSON.parse(jsonMatch[0]) as CompanyEnrichment;
    return enrichment;
  } catch (error) {
    console.error('Error researching company:', error);
    return {};
  }
}

// GET - Bulk enrich organizations (preview mode)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const onlySyndicate = searchParams.get('onlySyndicate') === 'true';

    // Find organizations that need enrichment (no description)
    const where: Record<string, unknown> = {
      description: null,
    };

    if (onlySyndicate) {
      where.syndicateDeals = { some: {} };
    }

    const orgsToEnrich = await prisma.organization.findMany({
      where,
      select: {
        id: true,
        name: true,
        domain: true,
        industry: true,
        website: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      count: orgsToEnrich.length,
      organizations: orgsToEnrich,
      message: `Found ${orgsToEnrich.length} organizations that could be enriched`,
    });
  } catch (error) {
    console.error('Failed to get enrichment candidates:', error);
    return NextResponse.json(
      { error: 'Failed to get enrichment candidates' },
      { status: 500 }
    );
  }
}
