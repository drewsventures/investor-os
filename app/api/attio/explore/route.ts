/**
 * Attio Explore API
 * GET - Explore Attio workspace structure (lists, objects, attributes)
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ATTIO_API_BASE = 'https://api.attio.com/v2';

async function attioRequest<T>(endpoint: string): Promise<T> {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) {
    throw new Error('ATTIO_API_KEY not set');
  }

  const response = await fetch(`${ATTIO_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Attio API error (${response.status}): ${error}`);
  }

  return response.json();
}

export async function GET() {
  try {
    // Get all lists in the workspace
    const lists = await attioRequest<{ data: any[] }>('/lists');

    // Get all objects (companies, people, etc.)
    const objects = await attioRequest<{ data: any[] }>('/objects');

    // For each list, get sample entries and stages
    const listsWithDetails = await Promise.all(
      lists.data.map(async (list: any) => {
        try {
          // Get list entries (first 5) - using POST query endpoint
          const entriesResponse = await fetch(`${ATTIO_API_BASE}/lists/${list.id.list_id}/entries/query`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.ATTIO_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ limit: 5 }),
          }).then(async r => {
            if (!r.ok) throw new Error(await r.text());
            return r.json();
          }) as { data: any[] };

          // Get list statuses (stages)
          let statuses: any[] = [];
          try {
            const statusesResponse = await attioRequest<{ data: any[] }>(
              `/lists/${list.id.list_id}/statuses`
            );
            statuses = statusesResponse.data || [];
          } catch {
            // Statuses might not be available for all lists
          }

          return {
            id: list.id.list_id,
            name: list.name,
            apiSlug: list.api_slug,
            objectType: list.parent_object,
            entryCount: entriesResponse.data?.length || 0,
            sampleEntries: entriesResponse.data?.slice(0, 3).map((e: any) => ({
              id: e.id?.entry_id,
              recordId: e.record_id,
              stage: e.stage_name,
              createdAt: e.created_at,
            })),
            stages: statuses.map((s: any) => ({
              id: s.id?.status_id,
              name: s.name,
              stage: s.stage_name,
            })),
          };
        } catch (error) {
          return {
            id: list.id.list_id,
            name: list.name,
            error: String(error),
          };
        }
      })
    );

    return NextResponse.json({
      workspace: {
        lists: listsWithDetails,
        objects: objects.data.map((o: any) => ({
          id: o.id?.object_id,
          name: o.singular_noun,
          pluralName: o.plural_noun,
          apiSlug: o.api_slug,
        })),
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
