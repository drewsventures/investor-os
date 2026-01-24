/**
 * Attio Deal Pipeline Sync API
 * GET - Preview deal pipeline entries from Attio
 * POST - Sync deal pipeline to Investor OS database
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ATTIO_API_BASE = 'https://api.attio.com/v2';
const RBV_DEAL_PIPELINE_ID = '2eee6f48-8643-47bd-98c8-83dd123a717d';

interface AttioEntryResponse {
  data: AttioEntry[];
}

interface AttioEntry {
  id: { entry_id: string };
  parent_record_id: string;
  created_at: string;
  values: Record<string, any[]>;
}

interface AttioRecordResponse {
  data: {
    id: { record_id: string };
    values: Record<string, any[]>;
  };
}

async function attioGet<T>(endpoint: string): Promise<T> {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) throw new Error('ATTIO_API_KEY not set');

  const response = await fetch(`${ATTIO_API_BASE}${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Attio GET ${endpoint} error (${response.status}): ${error}`);
  }
  return response.json();
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

// Helper to extract text value from Attio record
function getTextValue(values: Record<string, any[]>, key: string): string | null {
  const arr = values[key];
  if (!arr || arr.length === 0) return null;
  return arr[0].value || arr[0].text || null;
}

// Helper to extract status from Attio entry
function getStatusValue(values: Record<string, any[]>): string | null {
  if (!values) return null;

  // Try different possible status field names
  const possibleKeys = ['status', 'stage', 'pipeline_stage', 'deal_stage'];
  for (const key of possibleKeys) {
    const arr = values[key];
    if (arr && arr.length > 0) {
      const first = arr[0];
      // Try different value structures
      if (first?.status?.title) return first.status.title;
      if (first?.option?.title) return first.option.title;
      if (first?.value) return first.value;
      if (typeof first === 'string') return first;
    }
  }
  return null;
}

// Helper to extract name from Attio record
function getNameValue(values: Record<string, any[]>): string | null {
  const arr = values['name'];
  if (!arr || arr.length === 0) return null;
  return arr[0].value || arr[0].full_name || null;
}

// Helper to extract domain from Attio record
function getDomainValue(values: Record<string, any[]>): string | null {
  const arr = values['domains'];
  if (!arr || arr.length === 0) return null;
  return arr[0].domain || arr[0].root_domain || null;
}

// Map Attio status to our DealStage
function mapStatusToDealStage(status: string | null): string {
  if (!status) return 'SOURCED';

  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes('sourced') || normalizedStatus.includes('new') || normalizedStatus.includes('incoming')) {
    return 'SOURCED';
  }
  if (normalizedStatus.includes('first') || normalizedStatus.includes('call') || normalizedStatus.includes('meeting')) {
    return 'FIRST_CALL';
  }
  if (normalizedStatus.includes('diligence') || normalizedStatus.includes('dd') || normalizedStatus.includes('review')) {
    return 'DILIGENCE';
  }
  if (normalizedStatus.includes('partner') || normalizedStatus.includes('ic') || normalizedStatus.includes('committee')) {
    return 'PARTNER_REVIEW';
  }
  if (normalizedStatus.includes('term') || normalizedStatus.includes('offer') || normalizedStatus.includes('negotiate')) {
    return 'TERM_SHEET';
  }
  if (normalizedStatus.includes('closing') || normalizedStatus.includes('legal') || normalizedStatus.includes('docs')) {
    return 'CLOSING';
  }
  if (normalizedStatus.includes('pass') || normalizedStatus.includes('decline') || normalizedStatus.includes('reject')) {
    return 'PASSED';
  }
  if (normalizedStatus.includes('portfolio') || normalizedStatus.includes('invested') || normalizedStatus.includes('closed')) {
    return 'PORTFOLIO';
  }

  return 'SOURCED';
}

/**
 * GET - Preview deal pipeline entries
 */
export async function GET() {
  try {
    // Fetch all deal pipeline entries
    const entriesResponse = await attioPost<AttioEntryResponse>(
      `/lists/${RBV_DEAL_PIPELINE_ID}/entries/query`,
      { limit: 500 }
    );

    const entries = entriesResponse.data;

    // Get unique company record IDs
    const companyRecordIds = [...new Set(entries.map(e => e.parent_record_id).filter(Boolean))];

    // Fetch company details for each record
    const companiesPromises = companyRecordIds.slice(0, 50).map(async (recordId) => {
      try {
        const company = await attioGet<AttioRecordResponse>(
          `/objects/companies/records/${recordId}`
        );
        return {
          recordId,
          name: getNameValue(company.data.values),
          domain: getDomainValue(company.data.values),
          description: getTextValue(company.data.values, 'description'),
          industry: getTextValue(company.data.values, 'categories'),
        };
      } catch {
        return { recordId, name: null, error: 'Failed to fetch' };
      }
    });

    const companies = await Promise.all(companiesPromises);
    const companyMap = new Map(companies.map(c => [c.recordId, c]));

    // Build preview data
    const previewEntries = entries.slice(0, 20).map(entry => {
      const company = companyMap.get(entry.parent_record_id);
      const status = getStatusValue(entry.values || {});

      return {
        entryId: entry.id?.entry_id || 'unknown',
        companyRecordId: entry.parent_record_id,
        companyName: company?.name || 'Unknown',
        companyDomain: company?.domain,
        attioStatus: status,
        mappedStage: mapStatusToDealStage(status),
        createdAt: entry.created_at,
        entryValues: entry.values ? Object.keys(entry.values) : [],
      };
    });

    // Check which companies already exist in our database
    const existingOrgs = await prisma.organization.findMany({
      select: { id: true, name: true, domain: true, canonicalKey: true }
    });
    const existingNames = new Set(existingOrgs.map(o => o.name.toLowerCase()));

    const matchedEntries = previewEntries.map(e => ({
      ...e,
      existsInDatabase: e.companyName ? existingNames.has(e.companyName.toLowerCase()) : false,
    }));

    return NextResponse.json({
      preview: true,
      totalEntries: entries.length,
      uniqueCompanies: companyRecordIds.length,
      previewCount: previewEntries.length,
      entries: matchedEntries,
      existingOrgsCount: existingOrgs.length,
      sampleStatuses: [...new Set(entries.map(e => getStatusValue(e.values || {})).filter(Boolean))],
    });
  } catch (error) {
    console.error('Failed to preview deal pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to preview deal pipeline', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST - Sync deal pipeline to database
 * Query params:
 * - limit: number of entries to sync (default: 100)
 * - createOrgs: "true" to create new organizations (default: false)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const createOrgs = searchParams.get('createOrgs') === 'true';

    const result = {
      total: 0,
      orgsCreated: 0,
      orgsUpdated: 0,
      dealsCreated: 0,
      dealsUpdated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Fetch deal pipeline entries
    const entriesResponse = await attioPost<AttioEntryResponse>(
      `/lists/${RBV_DEAL_PIPELINE_ID}/entries/query`,
      { limit }
    );

    const entries = entriesResponse.data;
    result.total = entries.length;

    // Get existing organizations
    const existingOrgs = await prisma.organization.findMany({
      select: { id: true, name: true, domain: true, canonicalKey: true }
    });

    // Process each entry
    for (const entry of entries) {
      try {
        // Fetch company details
        let companyName: string | null = null;
        let companyDomain: string | null = null;
        let companyDescription: string | null = null;

        if (entry.parent_record_id) {
          const companyResponse = await attioGet<AttioRecordResponse>(
            `/objects/companies/records/${entry.parent_record_id}`
          );
          companyName = getNameValue(companyResponse.data.values);
          companyDomain = getDomainValue(companyResponse.data.values);
          companyDescription = getTextValue(companyResponse.data.values, 'description');
        }

        if (!companyName) {
          result.skipped++;
          continue;
        }

        // Find or create organization
        let organization = existingOrgs.find(o =>
          o.name.toLowerCase() === companyName!.toLowerCase() ||
          (companyDomain && o.domain?.toLowerCase() === companyDomain.toLowerCase()) ||
          (companyDomain && o.canonicalKey === companyDomain.toLowerCase())
        );

        if (!organization) {
          if (!createOrgs) {
            result.skipped++;
            continue;
          }

          // Create new organization
          const canonicalKey = companyDomain || companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const newOrg = await prisma.organization.create({
            data: {
              canonicalKey,
              name: companyName,
              domain: companyDomain,
              description: companyDescription,
              organizationType: 'PROSPECT',
            },
          });
          organization = { id: newOrg.id, name: newOrg.name, domain: newOrg.domain, canonicalKey: newOrg.canonicalKey };
          existingOrgs.push(organization);
          result.orgsCreated++;
        }

        // Get status and map to stage
        const status = getStatusValue(entry.values);
        const stage = mapStatusToDealStage(status);

        // Find or create deal
        const existingDeal = await prisma.deal.findFirst({
          where: {
            organizationId: organization.id,
          },
        });

        if (existingDeal) {
          // Update deal stage
          await prisma.deal.update({
            where: { id: existingDeal.id },
            data: {
              stage: stage as any,
            },
          });
          result.dealsUpdated++;
        } else {
          // Create new deal
          await prisma.deal.create({
            data: {
              name: `${companyName} - RBV Investment`,
              organizationId: organization.id,
              stage: stage as any,
              dealType: 'EQUITY',
              firstContactDate: new Date(entry.created_at),
            },
          });
          result.dealsCreated++;
        }

        // Update organization type if it's now in deal pipeline
        if (organization) {
          await prisma.organization.update({
            where: { id: organization.id },
            data: {
              organizationType: stage === 'PORTFOLIO' ? 'PORTFOLIO' : 'PROSPECT',
            },
          });
          result.orgsUpdated++;
        }

      } catch (error) {
        result.errors.push(`Failed to process entry ${entry.id.entry_id}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${result.dealsCreated + result.dealsUpdated} deals from ${result.total} entries`,
      result,
    });
  } catch (error) {
    console.error('Pipeline sync failed:', error);
    return NextResponse.json(
      { error: 'Pipeline sync failed', details: String(error) },
      { status: 500 }
    );
  }
}
