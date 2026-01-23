/**
 * Attio Sync API
 * POST - Sync companies and people from Attio CRM to Investor OS
 * GET - Check sync status and preview what will be imported
 *
 * This sync ONLY enriches existing organizations - it does not create new ones.
 * People are created and linked to their organizations via Relationships.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAttioClient, AttioCompany, AttioPerson, AttioClient } from '@/lib/attio';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface SyncResult {
  companies: {
    total: number;
    enriched: number;
    skipped: number;
    notFound: number;
    errors: string[];
  };
  people: {
    total: number;
    created: number;
    updated: number;
    linked: number;
    skipped: number;
    errors: string[];
  };
}

/**
 * GET - Preview what will be synced from Attio
 */
export async function GET() {
  try {
    const client = createAttioClient();

    // Fetch preview data
    const [companies, people] = await Promise.all([
      client.listCompanies(10),
      client.listPeople(10),
    ]);

    // Check which companies exist in our database
    const existingOrgs = await prisma.organization.findMany({
      select: { name: true, domain: true }
    });
    const existingNames = new Set(existingOrgs.map(o => o.name.toLowerCase()));
    const existingDomains = new Set(existingOrgs.filter(o => o.domain).map(o => o.domain!.toLowerCase()));

    const companiesWithMatch = companies.map(c => ({
      name: c.name,
      domain: c.domain,
      industry: c.industry,
      city: c.city,
      country: c.country,
      matchesExisting: c.name ? existingNames.has(c.name.toLowerCase()) : false,
      matchesByDomain: c.domain ? existingDomains.has(c.domain.toLowerCase()) : false
    }));

    return NextResponse.json({
      preview: true,
      message: 'This sync will ONLY enrich existing organizations - it will not create new ones.',
      companies: {
        sampleCount: companies.length,
        samples: companiesWithMatch,
      },
      people: {
        sampleCount: people.length,
        samples: people.map(p => ({
          name: p.fullName,
          email: p.email,
          jobTitle: p.jobTitle,
          city: p.city,
          hasCompany: !!p.companyRecordId,
        })),
      },
      existingOrganizations: existingOrgs.length,
    });
  } catch (error) {
    console.error('Failed to preview Attio data:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Attio', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST - Sync data from Attio
 * Query params:
 * - type: "companies" | "people" | "all" (default: "all")
 * - mode: "preview" | "sync" (default: "sync")
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const syncType = searchParams.get('type') || 'all';
    const mode = searchParams.get('mode') || 'sync';

    const client = createAttioClient();
    const result: SyncResult = {
      companies: { total: 0, enriched: 0, skipped: 0, notFound: 0, errors: [] },
      people: { total: 0, created: 0, updated: 0, linked: 0, skipped: 0, errors: [] },
    };

    // First, get all existing organizations for matching
    const existingOrgs = await prisma.organization.findMany({
      select: { id: true, name: true, domain: true, canonicalKey: true }
    });

    // Always fetch companies first to populate the cache for person lookups
    const companies = await client.listCompanies();

    // Sync companies (enrich existing only)
    if (syncType === 'companies' || syncType === 'all') {
      result.companies.total = companies.length;

      if (mode === 'sync') {
        await enrichCompanies(companies, existingOrgs, result.companies);
      }
    }

    // Sync people (create and link to organizations)
    if (syncType === 'people' || syncType === 'all') {
      const people = await client.listPeople();
      result.people.total = people.length;

      if (mode === 'sync') {
        await syncPeople(people, existingOrgs, client, result.people);
      }
    }

    return NextResponse.json({
      success: true,
      mode,
      message: mode === 'sync'
        ? 'Sync completed. Only existing organizations were enriched.'
        : 'Preview mode - no changes made.',
      result,
    });
  } catch (error) {
    console.error('Attio sync failed:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Find matching organization by name or domain
 */
function findMatchingOrg(
  company: { name: string | null; domain: string | null },
  existingOrgs: Array<{ id: string; name: string; domain: string | null; canonicalKey: string }>
): { id: string; name: string } | null {
  // Try to match by domain first (most reliable)
  if (company.domain) {
    const domainLower = company.domain.toLowerCase().replace(/^www\./, '');
    const byDomain = existingOrgs.find(o =>
      o.domain?.toLowerCase().replace(/^www\./, '') === domainLower ||
      o.canonicalKey === domainLower
    );
    if (byDomain) return { id: byDomain.id, name: byDomain.name };
  }

  // Try to match by name (fuzzy - lowercase comparison)
  if (company.name) {
    const nameLower = company.name.toLowerCase();
    const byName = existingOrgs.find(o => o.name.toLowerCase() === nameLower);
    if (byName) return { id: byName.id, name: byName.name };
  }

  return null;
}

/**
 * Enrich existing organizations with Attio data (no new org creation)
 */
async function enrichCompanies(
  companies: AttioCompany[],
  existingOrgs: Array<{ id: string; name: string; domain: string | null; canonicalKey: string }>,
  result: SyncResult['companies']
) {
  for (const company of companies) {
    if (!company.name) {
      result.skipped++;
      continue;
    }

    const match = findMatchingOrg(company, existingOrgs);

    if (!match) {
      result.notFound++;
      continue;
    }

    try {
      // Get current organization to check which fields are empty
      const existing = await prisma.organization.findUnique({
        where: { id: match.id }
      });

      if (!existing) {
        result.notFound++;
        continue;
      }

      // Only fill in missing fields (don't overwrite)
      const updateData: Record<string, string | null> = {};

      if (!existing.description && company.description) {
        updateData.description = company.description;
      }
      if (!existing.industry && company.industry) {
        updateData.industry = company.industry;
      }
      if (!existing.city && company.city) {
        updateData.city = company.city;
      }
      if (!existing.country && company.country) {
        updateData.country = company.country;
      }
      if (!existing.domain && company.domain) {
        updateData.domain = company.domain;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.organization.update({
          where: { id: match.id },
          data: updateData,
        });
        result.enriched++;
      } else {
        result.skipped++;
      }
    } catch (error) {
      result.errors.push(`Failed to enrich company ${company.name}: ${error}`);
    }
  }
}

/**
 * Sync people from Attio - create people and link to organizations
 */
async function syncPeople(
  people: AttioPerson[],
  existingOrgs: Array<{ id: string; name: string; domain: string | null; canonicalKey: string }>,
  client: AttioClient,
  result: SyncResult['people']
) {
  for (const person of people) {
    const fullName = person.fullName ||
      [person.firstName, person.lastName].filter(Boolean).join(' ');

    if (!fullName) {
      result.skipped++;
      continue;
    }

    try {
      // Create canonical key from email or name
      const canonicalKey = person.email
        ? person.email.toLowerCase()
        : fullName.toLowerCase().replace(/[^a-z0-9]/g, '-');

      // Check if person exists
      let existingPerson = await prisma.person.findFirst({
        where: {
          OR: [
            { canonicalKey },
            person.email ? { email: person.email } : {},
            { fullName },
          ].filter(c => Object.keys(c).length > 0),
        },
      });

      if (existingPerson) {
        // Update existing person with Attio data (only fill in missing fields)
        const updateData: Record<string, string | null> = {};

        if (!existingPerson.email && person.email) {
          updateData.email = person.email;
        }
        if (!existingPerson.phone && person.phone) {
          updateData.phone = person.phone;
        }
        if (!existingPerson.linkedInUrl && person.linkedinUrl) {
          updateData.linkedInUrl = person.linkedinUrl;
        }
        if (!existingPerson.twitterHandle && person.twitterHandle) {
          updateData.twitterHandle = person.twitterHandle;
        }
        if (!existingPerson.city && person.city) {
          updateData.city = person.city;
        }
        if (!existingPerson.country && person.country) {
          updateData.country = person.country;
        }

        if (Object.keys(updateData).length > 0) {
          existingPerson = await prisma.person.update({
            where: { id: existingPerson.id },
            data: updateData,
          });
          result.updated++;
        } else {
          result.skipped++;
        }
      } else {
        // Create new person
        existingPerson = await prisma.person.create({
          data: {
            canonicalKey,
            firstName: person.firstName || fullName.split(' ')[0] || 'Unknown',
            lastName: person.lastName || fullName.split(' ').slice(1).join(' ') || '',
            fullName,
            email: person.email,
            phone: person.phone,
            linkedInUrl: person.linkedinUrl,
            twitterHandle: person.twitterHandle,
            city: person.city,
            country: person.country,
          },
        });
        result.created++;
      }

      // Try to link person to organization via their company
      if (person.companyRecordId) {
        // Look up the company from Attio cache
        const attioCompany = await client.getCompanyById(person.companyRecordId);

        if (attioCompany) {
          const org = findMatchingOrg(attioCompany, existingOrgs);

          if (org) {
            await linkPersonToOrg(existingPerson.id, org.id, person.jobTitle);
            result.linked++;
          }
        }
      }
    } catch (error) {
      result.errors.push(`Failed to sync person ${fullName}: ${error}`);
    }
  }
}

/**
 * Create a WORKS_AT relationship between a person and organization
 */
async function linkPersonToOrg(personId: string, organizationId: string, role?: string | null) {
  // Check if relationship already exists
  const existing = await prisma.relationship.findFirst({
    where: {
      sourceType: 'Person',
      sourceId: personId,
      targetType: 'Organization',
      targetId: organizationId,
      relationshipType: 'WORKS_AT',
      isActive: true,
    }
  });

  if (existing) {
    // Update role if provided and different
    if (role && (existing.properties as any)?.role !== role) {
      await prisma.relationship.update({
        where: { id: existing.id },
        data: {
          properties: {
            ...(existing.properties as object || {}),
            role
          }
        }
      });
    }
    return;
  }

  // Create new relationship
  await prisma.relationship.create({
    data: {
      sourceType: 'Person',
      sourceId: personId,
      targetType: 'Organization',
      targetId: organizationId,
      relationshipType: 'WORKS_AT',
      properties: role ? { role } : {},
      strength: 1.0,
      confidence: 1.0,
      isActive: true,
      sourceOfTruth: 'attio',
    }
  });
}
