/**
 * Attio Explore API
 * GET - Explore Attio workspace structure (lists, objects, attributes)
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ATTIO_API_BASE = 'https://api.attio.com/v2';

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

export async function GET() {
  try {
    // Get all lists
    const lists = await attioGet<{ data: any[] }>('/lists');

    // Get all objects
    const objects = await attioGet<{ data: any[] }>('/objects');

    // Focus on key lists - RBV Deal Pipeline
    const dealPipelineList = lists.data.find((l: any) => l.name === 'RBV Deal Pipeline');

    let dealPipelineDetails = null;
    if (dealPipelineList) {
      try {
        // Query list entries using POST
        const entriesResponse = await attioPost<{ data: any[] }>(
          `/lists/${dealPipelineList.id.list_id}/entries/query`,
          { limit: 10 }
        );

        dealPipelineDetails = {
          id: dealPipelineList.id.list_id,
          name: dealPipelineList.name,
          apiSlug: dealPipelineList.api_slug,
          parentObject: dealPipelineList.parent_object,
          entryCount: entriesResponse.data.length,
          sampleEntries: entriesResponse.data.slice(0, 5).map((e: any) => ({
            entryId: e.id?.entry_id,
            recordId: e.record_id,
            parentRecordId: e.parent_record_id,
            values: e.values,
            createdAt: e.created_at,
          })),
        };
      } catch (error) {
        dealPipelineDetails = {
          id: dealPipelineList.id.list_id,
          name: dealPipelineList.name,
          error: String(error),
        };
      }
    }

    return NextResponse.json({
      workspace: {
        totalLists: lists.data.length,
        listNames: lists.data.map((l: any) => ({ id: l.id?.list_id, name: l.name })),
        objects: objects.data.map((o: any) => ({
          id: o.id?.object_id,
          name: o.singular_noun,
          pluralName: o.plural_noun,
          apiSlug: o.api_slug,
        })),
        dealPipeline: dealPipelineDetails,
      },
    });
  } catch (error) {
    console.error('Failed to explore Attio:', error);
    return NextResponse.json(
      { error: 'Failed to explore Attio', details: String(error) },
      { status: 500 }
    );
  }
}
