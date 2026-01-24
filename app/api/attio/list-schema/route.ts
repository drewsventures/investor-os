/**
 * Attio List Schema API
 * GET - Get the schema/attributes for a specific list
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ATTIO_API_BASE = 'https://api.attio.com/v2';
const RBV_DEAL_PIPELINE_ID = '2eee6f48-8643-47bd-98c8-83dd123a717d';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId') || RBV_DEAL_PIPELINE_ID;

    // Get list details
    const list = await attioGet<{ data: any }>(`/lists/${listId}`);

    // Get list attributes
    const attributes = await attioGet<{ data: any[] }>(`/lists/${listId}/attributes`);

    // Get a few entries with full data
    const entriesResponse = await attioPost<{ data: any[] }>(
      `/lists/${listId}/entries/query`,
      { limit: 3 }
    );

    // Get statuses if available
    let statuses: any[] = [];
    try {
      const statusesResponse = await attioGet<{ data: any[] }>(`/lists/${listId}/statuses`);
      statuses = statusesResponse.data || [];
    } catch {
      // Statuses might not be available
    }

    return NextResponse.json({
      list: {
        id: list.data.id,
        name: list.data.name,
        apiSlug: list.data.api_slug,
        parentObject: list.data.parent_object,
        workspaceAccess: list.data.workspace_access,
      },
      attributes: attributes.data.map((attr: any) => ({
        id: attr.id?.attribute_id,
        name: attr.name,
        apiSlug: attr.api_slug,
        type: attr.type,
        isSystem: attr.is_system_attribute,
        options: attr.config?.statuses || attr.config?.options,
      })),
      statuses,
      sampleEntries: entriesResponse.data.map((entry: any) => ({
        id: entry.id,
        parentRecordId: entry.parent_record_id,
        values: entry.values,
        rawEntry: entry,
      })),
    });
  } catch (error) {
    console.error('Failed to get list schema:', error);
    return NextResponse.json(
      { error: 'Failed to get list schema', details: String(error) },
      { status: 500 }
    );
  }
}
