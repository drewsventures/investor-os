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
  values?: Record<string, any[]>;
  entry_values?: Record<string, any[]>;  // Attio uses entry_values for list entry data
}

interface ParsedEntryData {
  status: string | null;
  owners: string | null;
  investmentRound: string | null;
  introSourceName: string | null;
  introSourceEmail: string | null;
  people: string | null;
  dealSource: string | null;
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
function getTextValue(values: Record<string, any[]> | null | undefined, key: string): string | null {
  if (!values) return null;
  const arr = values[key];
  if (!arr || arr.length === 0) return null;
  const first = arr[0];
  if (!first) return null;
  return first.value || first.text || null;
}

// Helper to extract status from Attio entry
function getStatusValue(values: Record<string, any[]> | null | undefined): string | null {
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

// Parse all entry data from Attio entry_values structure
function parseEntryData(entry: AttioEntry): ParsedEntryData {
  // Attio uses entry_values for list entry attributes
  const values = entry.entry_values || entry.values || {};

  // Extract status
  const statusArr = values['status'];
  let status: string | null = null;
  if (statusArr && statusArr.length > 0) {
    status = statusArr[0]?.status?.title || null;
  }

  // Extract owners
  const ownersArr = values['owners'];
  let owners: string | null = null;
  if (ownersArr && ownersArr.length > 0) {
    owners = ownersArr[0]?.value || null;
  }

  // Extract investment round
  const roundArr = values['investment_round'];
  let investmentRound: string | null = null;
  if (roundArr && roundArr.length > 0) {
    investmentRound = roundArr[0]?.value || null;
  }

  // Extract source of introduction
  const introNameArr = values['source_of_introduction_full_name'];
  let introSourceName: string | null = null;
  if (introNameArr && introNameArr.length > 0) {
    introSourceName = introNameArr[0]?.value || null;
  }

  const introEmailArr = values['source_of_introduction_email'];
  let introSourceEmail: string | null = null;
  if (introEmailArr && introEmailArr.length > 0) {
    introSourceEmail = introEmailArr[0]?.value || null;
  }

  // Extract people
  const peopleArr = values['people'];
  let people: string | null = null;
  if (peopleArr && peopleArr.length > 0) {
    people = peopleArr[0]?.value || null;
  }

  // Extract deal source
  const sourceArr = values['deal_source'];
  let dealSource: string | null = null;
  if (sourceArr && sourceArr.length > 0) {
    dealSource = sourceArr[0]?.option?.title || sourceArr[0]?.value || null;
  }

  return {
    status,
    owners,
    investmentRound,
    introSourceName,
    introSourceEmail,
    people,
    dealSource,
  };
}

// Helper to extract name from Attio record
function getNameValue(values: Record<string, any[]> | null | undefined): string | null {
  if (!values) return null;
  const arr = values['name'];
  if (!arr || arr.length === 0) return null;
  const first = arr[0];
  if (!first) return null;
  return first.value || first.full_name || null;
}

// Helper to extract domain from Attio record
function getDomainValue(values: Record<string, any[]> | null | undefined): string | null {
  if (!values) return null;
  const arr = values['domains'];
  if (!arr || arr.length === 0) return null;
  const first = arr[0];
  if (!first) return null;
  return first.domain || first.root_domain || null;
}

// Map Attio status to our DealStage
function mapStatusToDealStage(status: string | null): string {
  if (!status) return 'SOURCED';

  const normalizedStatus = status.toLowerCase();

  // Sourced / Early stage
  if (normalizedStatus.includes('sourced') || normalizedStatus.includes('new') || normalizedStatus.includes('incoming') || normalizedStatus.includes('tracking')) {
    return 'SOURCED';
  }
  // First call / Initial meeting
  if (normalizedStatus.includes('first') || normalizedStatus.includes('call') || normalizedStatus.includes('intro') || normalizedStatus.includes('scheduled')) {
    return 'FIRST_CALL';
  }
  // Diligence
  if (normalizedStatus.includes('diligence') || normalizedStatus.includes('dd') || normalizedStatus.includes('active')) {
    return 'DILIGENCE';
  }
  // Partner review / IC
  if (normalizedStatus.includes('partner') || normalizedStatus.includes('ic') || normalizedStatus.includes('committee') || normalizedStatus.includes('review')) {
    return 'PARTNER_REVIEW';
  }
  // Term sheet
  if (normalizedStatus.includes('term') || normalizedStatus.includes('offer') || normalizedStatus.includes('negotiate')) {
    return 'TERM_SHEET';
  }
  // Closing
  if (normalizedStatus.includes('closing') || normalizedStatus.includes('legal') || normalizedStatus.includes('docs') || normalizedStatus.includes('signing')) {
    return 'CLOSING';
  }
  // Passed
  if (normalizedStatus.includes('pass') || normalizedStatus.includes('decline') || normalizedStatus.includes('reject') || normalizedStatus.includes('dead')) {
    return 'PASSED';
  }
  // Portfolio / Invested
  if (normalizedStatus.includes('portfolio') || normalizedStatus.includes('invested') || normalizedStatus.includes('closed') || normalizedStatus.includes('funded') || normalizedStatus.includes('syndicate')) {
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
        const values = company?.data?.values || {};
        return {
          recordId,
          name: getNameValue(values),
          domain: getDomainValue(values),
          description: getTextValue(values, 'description'),
          industry: getTextValue(values, 'categories'),
        };
      } catch (err) {
        return { recordId, name: null, error: String(err) };
      }
    });

    const companies = await Promise.all(companiesPromises);
    const companyMap = new Map(companies.map(c => [c.recordId, c]));

    // Build preview data
    const previewEntries = entries.slice(0, 20).map(entry => {
      const company = companyMap.get(entry.parent_record_id);
      const entryData = parseEntryData(entry);

      return {
        entryId: entry.id?.entry_id || 'unknown',
        companyRecordId: entry.parent_record_id,
        companyName: company?.name || 'Unknown',
        companyDomain: company?.domain,
        attioStatus: entryData.status,
        mappedStage: mapStatusToDealStage(entryData.status),
        owners: entryData.owners,
        investmentRound: entryData.investmentRound,
        introSourceName: entryData.introSourceName,
        dealSource: entryData.dealSource,
        people: entryData.people,
        createdAt: entry.created_at,
        entryValueKeys: entry.entry_values ? Object.keys(entry.entry_values) : (entry.values ? Object.keys(entry.values) : []),
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
      sampleStatuses: [...new Set(entries.map(e => parseEntryData(e).status).filter(Boolean))],
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

        // Parse entry data including status
        const entryData = parseEntryData(entry);
        const stage = mapStatusToDealStage(entryData.status);

        // Find or create deal
        const existingDeal = await prisma.deal.findFirst({
          where: {
            organizationId: organization.id,
          },
        });

        if (existingDeal) {
          // Check if stage changed
          if (existingDeal.stage !== stage) {
            // Record stage history
            await prisma.dealStageHistory.create({
              data: {
                dealId: existingDeal.id,
                fromStage: existingDeal.stage,
                toStage: stage as any,
                triggeredBy: 'attio_sync',
                notes: `Status in Attio: ${entryData.status || 'none'}`,
              },
            });
          }

          // Update deal with Attio references and additional data
          await prisma.deal.update({
            where: { id: existingDeal.id },
            data: {
              stage: stage as any,
              attioEntryId: entry.id.entry_id,
              attioRecordId: entry.parent_record_id,
              sourceChannel: entryData.dealSource || existingDeal.sourceChannel,
              referralSource: entryData.introSourceName || existingDeal.referralSource,
            },
          });
          result.dealsUpdated++;
        } else {
          // Create new deal with Attio references and additional data
          const newDeal = await prisma.deal.create({
            data: {
              name: `${companyName} - RBV Investment`,
              organizationId: organization.id,
              stage: stage as any,
              dealType: 'EQUITY',
              firstContactDate: new Date(entry.created_at),
              attioEntryId: entry.id.entry_id,
              attioRecordId: entry.parent_record_id,
              sourceChannel: entryData.dealSource,
              referralSource: entryData.introSourceName,
            },
          });

          // Record initial stage in history
          await prisma.dealStageHistory.create({
            data: {
              dealId: newDeal.id,
              fromStage: null,
              toStage: stage as any,
              triggeredBy: 'attio_import',
              notes: `Imported from Attio. Status: ${entryData.status || 'none'}`,
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
