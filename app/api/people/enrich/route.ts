/**
 * People Enrichment API
 * POST - Enrich people profiles with public data (LinkedIn, etc.)
 * GET - Preview people that need enrichment
 *
 * Uses Claude with web search to find real, publicly available information
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for web searches

interface EnrichmentResult {
  total: number;
  enriched: number;
  skipped: number;
  errors: string[];
  details: Array<{
    name: string;
    company: string;
    fieldsUpdated: string[];
  }>;
}

/**
 * GET - Preview people that need enrichment
 */
export async function GET() {
  try {
    // Get people with their organizations
    const people = await prisma.person.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        linkedInUrl: true,
        twitterHandle: true,
        phone: true,
        city: true,
        country: true,
      }
    });

    // Get relationships to find company names
    const relationships = await prisma.relationship.findMany({
      where: {
        sourceType: 'Person',
        relationshipType: 'WORKS_AT',
        isActive: true,
      },
      select: {
        sourceId: true,
        targetId: true,
        properties: true,
      }
    });

    const orgIds = [...new Set(relationships.map(r => r.targetId))];
    const orgs = await prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true }
    });
    const orgMap = new Map(orgs.map(o => [o.id, o.name]));

    // Build people with company info
    const peopleWithCompanies = people.map(p => {
      const rel = relationships.find(r => r.sourceId === p.id);
      const companyName = rel ? orgMap.get(rel.targetId) : null;
      const role = (rel?.properties as any)?.role;

      // Check what's missing
      const missingFields: string[] = [];
      if (!p.linkedInUrl) missingFields.push('linkedInUrl');
      if (!p.city) missingFields.push('city');
      if (!p.country) missingFields.push('country');
      if (!role || role === 'Unknown') missingFields.push('role');

      return {
        id: p.id,
        name: p.fullName,
        email: p.email,
        company: companyName,
        role: role || 'Unknown',
        hasLinkedIn: !!p.linkedInUrl,
        hasLocation: !!(p.city || p.country),
        missingFields,
        needsEnrichment: missingFields.length > 0,
      };
    });

    const needEnrichment = peopleWithCompanies.filter(p => p.needsEnrichment);

    return NextResponse.json({
      total: people.length,
      needEnrichment: needEnrichment.length,
      fullyEnriched: people.length - needEnrichment.length,
      people: peopleWithCompanies,
    });
  } catch (error) {
    console.error('Failed to get enrichment preview:', error);
    return NextResponse.json(
      { error: 'Failed to get enrichment preview', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST - Enrich people with public data using Claude with web search
 * Query params:
 * - limit: number of people to enrich (default: 5)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20);

    const anthropic = new Anthropic();

    const result: EnrichmentResult = {
      total: 0,
      enriched: 0,
      skipped: 0,
      errors: [],
      details: [],
    };

    // Get people who need enrichment (missing LinkedIn or location)
    const people = await prisma.person.findMany({
      where: {
        OR: [
          { linkedInUrl: null },
          { city: null },
        ]
      },
      take: limit,
    });

    result.total = people.length;

    // Get relationships for company context
    const relationships = await prisma.relationship.findMany({
      where: {
        sourceType: 'Person',
        sourceId: { in: people.map(p => p.id) },
        relationshipType: 'WORKS_AT',
        isActive: true,
      }
    });

    const orgIds = [...new Set(relationships.map(r => r.targetId))];
    const orgs = await prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true }
    });
    const orgMap = new Map(orgs.map(o => [o.id, o.name]));

    for (const person of people) {
      const rel = relationships.find(r => r.sourceId === person.id);
      const companyName = rel ? orgMap.get(rel.targetId) || 'Unknown' : 'Unknown';
      const currentRole = (rel?.properties as any)?.role;

      try {
        // Use Claude with web search to find public info
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          tools: [
            {
              type: 'web_search_20250305',
              name: 'web_search',
              max_uses: 3,
            }
          ],
          messages: [
            {
              role: 'user',
              content: `Find the LinkedIn profile and professional information for "${person.fullName}" who works at "${companyName}".

Search for their LinkedIn profile and any public professional information. Then provide a JSON response with what you found.

After searching, respond with ONLY this JSON format:
{
  "linkedInUrl": "the exact LinkedIn profile URL (e.g., https://linkedin.com/in/username) or null",
  "jobTitle": "their job title/role at ${companyName} or null",
  "city": "city they're based in or null",
  "country": "2-letter country code (US, UK, etc.) or null",
  "twitterHandle": "Twitter/X handle without @ or null"
}

Important:
- Only include LinkedIn URLs you actually found and verified
- The LinkedIn URL must be a real, specific profile URL
- Return null for any field you couldn't verify`
            }
          ],
        });

        // Debug: log what we got back
        console.log(`Response for ${person.fullName}:`, JSON.stringify(response.content, null, 2));

        // Find the final text response (after tool use)
        let enrichmentData = null;
        let rawText = '';
        for (const block of response.content) {
          if (block.type === 'text') {
            rawText = block.text;
            try {
              const jsonMatch = block.text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                enrichmentData = JSON.parse(jsonMatch[0]);
              }
            } catch {
              // Try next block
            }
          }
        }

        if (!enrichmentData) {
          console.log(`No JSON found for ${person.fullName}. Raw text:`, rawText);
          result.skipped++;
          continue;
        }

        // Build update data (only update fields that are currently empty)
        const updateData: Record<string, string> = {};
        const fieldsUpdated: string[] = [];

        if (!person.linkedInUrl && enrichmentData.linkedInUrl && enrichmentData.linkedInUrl !== 'null') {
          updateData.linkedInUrl = enrichmentData.linkedInUrl;
          fieldsUpdated.push('linkedInUrl');
        }
        if (!person.city && enrichmentData.city && enrichmentData.city !== 'null') {
          updateData.city = enrichmentData.city;
          fieldsUpdated.push('city');
        }
        if (!person.country && enrichmentData.country && enrichmentData.country !== 'null') {
          updateData.country = enrichmentData.country;
          fieldsUpdated.push('country');
        }
        if (!person.twitterHandle && enrichmentData.twitterHandle && enrichmentData.twitterHandle !== 'null') {
          updateData.twitterHandle = enrichmentData.twitterHandle;
          fieldsUpdated.push('twitterHandle');
        }

        // Update person if we have new data
        if (Object.keys(updateData).length > 0) {
          await prisma.person.update({
            where: { id: person.id },
            data: updateData,
          });
        }

        // Update role in relationship if found and current is Unknown
        if (enrichmentData.jobTitle && enrichmentData.jobTitle !== 'null' && (!currentRole || currentRole === 'Unknown') && rel) {
          await prisma.relationship.update({
            where: { id: rel.id },
            data: {
              properties: {
                ...(rel.properties as object || {}),
                role: enrichmentData.jobTitle,
              }
            }
          });
          fieldsUpdated.push('role');
        }

        if (fieldsUpdated.length > 0) {
          result.enriched++;
          result.details.push({
            name: person.fullName,
            company: companyName,
            fieldsUpdated,
          });
        } else {
          result.skipped++;
        }

      } catch (error) {
        result.errors.push(`Failed to enrich ${person.fullName}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Enriched ${result.enriched} of ${result.total} people`,
      result,
    });
  } catch (error) {
    console.error('Enrichment failed:', error);
    return NextResponse.json(
      { error: 'Enrichment failed', details: String(error) },
      { status: 500 }
    );
  }
}
