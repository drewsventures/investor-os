/**
 * Attio Pipeline People Sync API
 * GET - Preview people from deal pipeline entries
 * POST - Sync people from deal pipeline to database
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ATTIO_API_BASE = 'https://api.attio.com/v2';
const RBV_DEAL_PIPELINE_ID = '2eee6f48-8643-47bd-98c8-83dd123a717d';

interface AttioEntry {
  id: { entry_id: string };
  parent_record_id: string;
  entry_values?: Record<string, any[]>;
}

async function attioPost<T>(endpoint: string, body: any): Promise<T> {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) throw new Error('ATTIO_API_KEY not set');

  const response = await fetch(`${ATTIO_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Attio POST ${endpoint} error (${response.status}): ${error}`);
  }
  return response.json();
}

// Parse people string: "Name <email>; Name2 <email2>"
function parsePeopleString(peopleStr: string): Array<{ name: string; email: string | null }> {
  if (!peopleStr) return [];

  const people: Array<{ name: string; email: string | null }> = [];
  const entries = peopleStr.split(';').map(s => s.trim()).filter(Boolean);

  for (const entry of entries) {
    // Match "Name <email>" pattern
    const match = entry.match(/^(.+?)\s*<([^>]+)>$/);
    if (match) {
      people.push({
        name: match[1].trim(),
        email: match[2].trim().toLowerCase(),
      });
    } else {
      // Just a name without email
      people.push({
        name: entry.trim(),
        email: null,
      });
    }
  }

  return people;
}

// Get company record ID to org mapping
async function getCompanyToOrgMapping(): Promise<Map<string, { id: string; name: string }>> {
  const deals = await prisma.deal.findMany({
    where: { attioRecordId: { not: null } },
    select: {
      attioRecordId: true,
      organization: {
        select: { id: true, name: true }
      }
    }
  });

  return new Map(
    deals
      .filter(d => d.attioRecordId)
      .map(d => [d.attioRecordId!, { id: d.organization.id, name: d.organization.name }])
  );
}

/**
 * GET - Preview people from deal pipeline
 */
export async function GET() {
  try {
    // Fetch all deal pipeline entries
    const entriesResponse = await attioPost<{ data: AttioEntry[] }>(
      `/lists/${RBV_DEAL_PIPELINE_ID}/entries/query`,
      { limit: 500 }
    );

    const entries = entriesResponse.data;
    const companyToOrg = await getCompanyToOrgMapping();

    // Extract all people from entries
    const allPeople: Array<{
      name: string;
      email: string | null;
      companyRecordId: string;
      companyName: string | null;
      organizationId: string | null;
    }> = [];

    for (const entry of entries) {
      const peopleArr = entry.entry_values?.['people'];
      if (!peopleArr || peopleArr.length === 0) continue;

      const peopleStr = peopleArr[0]?.value;
      if (!peopleStr) continue;

      const parsedPeople = parsePeopleString(peopleStr);
      const org = companyToOrg.get(entry.parent_record_id);

      for (const person of parsedPeople) {
        allPeople.push({
          ...person,
          companyRecordId: entry.parent_record_id,
          companyName: org?.name || null,
          organizationId: org?.id || null,
        });
      }
    }

    // Check which people already exist
    const existingEmails = new Set(
      (await prisma.person.findMany({
        where: { email: { not: null } },
        select: { email: true }
      })).map(p => p.email!.toLowerCase())
    );

    const peopleWithStatus = allPeople.map(p => ({
      ...p,
      existsInDatabase: p.email ? existingEmails.has(p.email) : false,
    }));

    const uniquePeople = new Map<string, typeof peopleWithStatus[0]>();
    for (const p of peopleWithStatus) {
      const key = p.email || p.name;
      if (!uniquePeople.has(key)) {
        uniquePeople.set(key, p);
      }
    }

    return NextResponse.json({
      preview: true,
      totalPeopleReferences: allPeople.length,
      uniquePeople: uniquePeople.size,
      withOrganization: [...uniquePeople.values()].filter(p => p.organizationId).length,
      alreadyExist: [...uniquePeople.values()].filter(p => p.existsInDatabase).length,
      samplePeople: [...uniquePeople.values()].slice(0, 30),
    });
  } catch (error) {
    console.error('Failed to preview pipeline people:', error);
    return NextResponse.json(
      { error: 'Failed to preview pipeline people', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST - Sync people from pipeline to database
 * Query params:
 * - limit: max people to sync (default: 100)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    const result = {
      total: 0,
      created: 0,
      updated: 0,
      linked: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Fetch all deal pipeline entries
    const entriesResponse = await attioPost<{ data: AttioEntry[] }>(
      `/lists/${RBV_DEAL_PIPELINE_ID}/entries/query`,
      { limit: 500 }
    );

    const entries = entriesResponse.data;
    const companyToOrg = await getCompanyToOrgMapping();

    // Extract all unique people
    const uniquePeople = new Map<string, {
      name: string;
      email: string | null;
      organizationId: string | null;
    }>();

    for (const entry of entries) {
      const peopleArr = entry.entry_values?.['people'];
      if (!peopleArr || peopleArr.length === 0) continue;

      const peopleStr = peopleArr[0]?.value;
      if (!peopleStr) continue;

      const parsedPeople = parsePeopleString(peopleStr);
      const org = companyToOrg.get(entry.parent_record_id);

      for (const person of parsedPeople) {
        const key = person.email || person.name;
        if (!uniquePeople.has(key)) {
          uniquePeople.set(key, {
            ...person,
            organizationId: org?.id || null,
          });
        }
      }
    }

    result.total = uniquePeople.size;
    let processed = 0;

    for (const [key, personData] of uniquePeople) {
      if (processed >= limit) break;
      processed++;

      try {
        // Check if person exists
        let person = await prisma.person.findFirst({
          where: {
            OR: [
              personData.email ? { email: personData.email } : {},
              { fullName: personData.name },
            ].filter(c => Object.keys(c).length > 0)
          }
        });

        if (person) {
          // Update if email was missing
          if (!person.email && personData.email) {
            await prisma.person.update({
              where: { id: person.id },
              data: { email: personData.email }
            });
            result.updated++;
          } else {
            result.skipped++;
          }
        } else {
          // Create new person
          const nameParts = personData.name.split(' ');
          const firstName = nameParts[0] || 'Unknown';
          const lastName = nameParts.slice(1).join(' ') || '';
          const canonicalKey = personData.email || personData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

          person = await prisma.person.create({
            data: {
              canonicalKey,
              firstName,
              lastName,
              fullName: personData.name,
              email: personData.email,
            }
          });
          result.created++;
        }

        // Link to organization if not already linked
        if (personData.organizationId && person) {
          const existingRelation = await prisma.relationship.findFirst({
            where: {
              sourceType: 'Person',
              sourceId: person.id,
              targetType: 'Organization',
              targetId: personData.organizationId,
              relationshipType: 'WORKS_AT',
              isActive: true,
            }
          });

          if (!existingRelation) {
            await prisma.relationship.create({
              data: {
                sourceType: 'Person',
                sourceId: person.id,
                targetType: 'Organization',
                targetId: personData.organizationId,
                relationshipType: 'WORKS_AT',
                properties: {},
                strength: 1.0,
                confidence: 1.0,
                isActive: true,
                sourceOfTruth: 'attio_pipeline',
              }
            });
            result.linked++;
          }
        }

      } catch (error) {
        result.errors.push(`Failed to process ${personData.name}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} people: ${result.created} created, ${result.linked} linked`,
      result,
    });
  } catch (error) {
    console.error('Pipeline people sync failed:', error);
    return NextResponse.json(
      { error: 'Pipeline people sync failed', details: String(error) },
      { status: 500 }
    );
  }
}
