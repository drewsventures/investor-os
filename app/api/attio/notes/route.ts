/**
 * Attio Notes API
 * GET - Fetch notes from Attio for companies
 * POST - Sync notes from Attio to local database
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ATTIO_API_BASE = 'https://api.attio.com/v2';

interface AttioNote {
  id: {
    workspace_id: string;
    note_id: string;
  };
  title: string;
  content_plaintext: string | null;
  content_markdown: string | null;
  parent_object: string;
  parent_record_id: string;
  created_at: string;
  created_by_actor: {
    type: string;
    id: string;
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

/**
 * GET - Fetch notes from Attio
 * Query params:
 * - recordId: specific Attio record ID to get notes for
 * - limit: max notes to fetch (default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build query string
    let queryParams = `limit=${limit}`;
    if (recordId) {
      queryParams += `&parent_record_id=${recordId}`;
    }

    // Fetch notes from Attio
    const notesResponse = await attioGet<{ data: AttioNote[] }>(
      `/notes?${queryParams}`
    );

    const notes = notesResponse.data || [];

    // Get local mapping of Attio record IDs to organizations
    const deals = await prisma.deal.findMany({
      where: { attioRecordId: { not: null } },
      select: {
        attioRecordId: true,
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    const recordToOrg = new Map(
      deals.map(d => [d.attioRecordId!, { id: d.organization.id, name: d.organization.name }])
    );

    // Enrich notes with org info
    const enrichedNotes = notes.map(note => ({
      id: note.id.note_id,
      title: note.title,
      contentPlaintext: note.content_plaintext,
      contentMarkdown: note.content_markdown,
      parentRecordId: note.parent_record_id,
      organization: recordToOrg.get(note.parent_record_id) || null,
      createdAt: note.created_at,
      createdByType: note.created_by_actor?.type,
    }));

    // Group by organization
    const notesByOrg: Record<string, typeof enrichedNotes> = {};
    for (const note of enrichedNotes) {
      const orgName = note.organization?.name || 'Unknown';
      if (!notesByOrg[orgName]) {
        notesByOrg[orgName] = [];
      }
      notesByOrg[orgName].push(note);
    }

    return NextResponse.json({
      total: notes.length,
      withOrganization: enrichedNotes.filter(n => n.organization).length,
      notes: enrichedNotes,
      notesByOrganization: notesByOrg,
    });
  } catch (error) {
    console.error('Failed to fetch Attio notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Attio notes', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST - Sync notes from Attio to local Fact storage
 * Notes are stored as Facts with factType = 'NOTE'
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '500');

    const result = {
      total: 0,
      synced: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Fetch all notes from Attio
    const notesResponse = await attioGet<{ data: AttioNote[] }>(
      `/notes?limit=${limit}`
    );

    const notes = notesResponse.data || [];
    result.total = notes.length;

    // Get local mapping of Attio record IDs to organizations
    const deals = await prisma.deal.findMany({
      where: { attioRecordId: { not: null } },
      select: {
        attioRecordId: true,
        organizationId: true,
      }
    });

    const recordToOrgId = new Map(
      deals.map(d => [d.attioRecordId!, d.organizationId])
    );

    // Check existing notes (by sourceId = note_id)
    const existingFacts = await prisma.fact.findMany({
      where: {
        factType: 'NOTE',
        sourceType: 'attio',
      },
      select: { sourceId: true }
    });
    const existingNoteIds = new Set(existingFacts.map(f => f.sourceId));

    for (const note of notes) {
      const orgId = recordToOrgId.get(note.parent_record_id);
      if (!orgId) {
        result.skipped++;
        continue;
      }

      if (existingNoteIds.has(note.id.note_id)) {
        result.skipped++;
        continue;
      }

      try {
        await prisma.fact.create({
          data: {
            organizationId: orgId,
            factType: 'NOTE',
            key: note.title || 'Untitled Note',
            value: note.content_plaintext || note.content_markdown || '',
            sourceType: 'attio',
            sourceId: note.id.note_id,
            confidence: 1.0,
            validFrom: new Date(note.created_at),
          }
        });
        result.synced++;
      } catch (error) {
        result.errors.push(`Failed to sync note ${note.id.note_id}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${result.synced} notes from Attio`,
      result,
    });
  } catch (error) {
    console.error('Failed to sync Attio notes:', error);
    return NextResponse.json(
      { error: 'Failed to sync Attio notes', details: String(error) },
      { status: 500 }
    );
  }
}
