/**
 * Attio LP Import API Route
 * POST: Import LP prospects from Attio list
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { createAttioClient, AttioListEntry, AttioLPRecord, AttioPerson, AttioCompany } from '@/lib/attio';
import { LPStage } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Map Attio status values to LPStage
function mapAttioStageToLPStage(attioStatus: string | null): LPStage {
  if (!attioStatus) return 'IDENTIFIED';

  const normalized = attioStatus.toLowerCase().trim();

  // Map common status names to stages
  const mappings: Record<string, LPStage> = {
    'identified': 'IDENTIFIED',
    'new': 'IDENTIFIED',
    'contacted': 'CONTACTED',
    'reached out': 'CONTACTED',
    'outreach': 'CONTACTED',
    'meeting scheduled': 'MEETING_SCHEDULED',
    'scheduled': 'MEETING_SCHEDULED',
    'met': 'MET',
    'meeting complete': 'MET',
    'had meeting': 'MET',
    'interested': 'INTERESTED',
    'showing interest': 'INTERESTED',
    'due diligence': 'DUE_DILIGENCE',
    'dd': 'DUE_DILIGENCE',
    'reviewing': 'DUE_DILIGENCE',
    'soft commit': 'SOFT_COMMIT',
    'verbal': 'SOFT_COMMIT',
    'verbal commit': 'SOFT_COMMIT',
    'hard commit': 'HARD_COMMIT',
    'committed': 'HARD_COMMIT',
    'signed': 'HARD_COMMIT',
    'funded': 'FUNDED',
    'closed': 'FUNDED',
    'passed': 'PASSED',
    'declined': 'PASSED',
    'not interested': 'PASSED',
  };

  return mappings[normalized] || 'IDENTIFIED';
}

// Extract domain from email
function extractDomainFromEmail(email: string | null): string | null {
  if (!email) return null;
  const parts = email.split('@');
  if (parts.length !== 2) return null;
  return parts[1].toLowerCase();
}

// Get text value from Attio entry values
function getTextValue(values: Record<string, any[]>, key: string): string | null {
  const arr = values[key];
  if (!arr || arr.length === 0) return null;
  const first = arr[0];
  return first.value || first.title || null;
}

// Get number value from Attio entry values
function getNumberValue(values: Record<string, any[]>, key: string): number | null {
  const arr = values[key];
  if (!arr || arr.length === 0) return null;
  const first = arr[0];
  const num = parseFloat(first.value || first);
  return isNaN(num) ? null : num;
}

// Get email from Attio entry
function getEmailValue(values: Record<string, any[]>): string | null {
  const arr = values['email_addresses'] || values['email'];
  if (!arr || arr.length === 0) return null;
  return arr[0].email_address || arr[0].value || null;
}

// Get select/status value from Attio entry
function getSelectValue(values: Record<string, any[]>, key: string): string | null {
  const arr = values[key];
  if (!arr || arr.length === 0) return null;
  const first = arr[0];
  return first.option?.title || first.title || first.value || null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { listName = 'RBV LP Fundraising Fund II' } = body;

    // Create Attio client
    let attioClient;
    try {
      attioClient = createAttioClient();
    } catch (error) {
      return NextResponse.json(
        { error: 'Attio API key not configured' },
        { status: 400 }
      );
    }

    // Find the list by name
    const list = await attioClient.getListByName(listName);
    if (!list) {
      return NextResponse.json(
        { error: `Attio list "${listName}" not found` },
        { status: 404 }
      );
    }

    // Fetch all entries from the list
    const entries = await attioClient.getListEntries(list.id.list_id);

    // Track import results
    const results = {
      imported: 0,
      skipped: 0,
      errors: 0,
      details: [] as string[],
    };

    // Process each entry
    for (const entry of entries) {
      try {
        // Get the parent record (person or company)
        const parentType = entry.parent_object; // 'people' or 'companies'
        const parentId = entry.parent_record_id;

        // Get entry-specific values (like status, target amount)
        const status = getSelectValue(entry.values, 'status');
        const targetAmount = getNumberValue(entry.values, 'target_amount') ||
                            getNumberValue(entry.values, 'commitment_target') ||
                            getNumberValue(entry.values, 'amount');
        const notes = getTextValue(entry.values, 'notes');

        let personId: string | null = null;
        let organizationId: string | null = null;
        let lpName: string | null = null;

        if (parentType === 'lps') {
          // Fetch the LP record from Attio's custom LP object
          const attioLP = await attioClient.getLPRecordById(parentId);

          if (!attioLP) {
            results.skipped++;
            results.details.push(`Skipped entry: could not fetch LP record ${parentId}`);
            continue;
          }

          lpName = attioLP.name;

          // Process associated people - get the first one as the primary contact
          if (attioLP.associatedPeopleIds.length > 0) {
            const attioPerson = await attioClient.getPersonById(attioLP.associatedPeopleIds[0]);

            if (attioPerson && attioPerson.email) {
              // Find or create person by email
              let person = await prisma.person.findUnique({
                where: { email: attioPerson.email },
              });

              if (!person) {
                person = await prisma.person.create({
                  data: {
                    email: attioPerson.email,
                    canonicalKey: attioPerson.email.toLowerCase(),
                    firstName: attioPerson.firstName || 'Unknown',
                    lastName: attioPerson.lastName || '',
                    fullName: attioPerson.fullName || attioPerson.email,
                    phone: attioPerson.phone || attioLP.phone,
                    linkedInUrl: attioPerson.linkedinUrl,
                    twitterHandle: attioPerson.twitterHandle,
                    city: attioPerson.city,
                    country: attioPerson.country,
                  },
                });
                results.details.push(`Created person: ${person.fullName}`);
              }

              personId = person.id;

              // Link person to company if available
              if (attioPerson.companyRecordId) {
                const attioCompany = await attioClient.getCompanyById(attioPerson.companyRecordId);
                if (attioCompany && attioCompany.name) {
                  const domain = attioCompany.domain || extractDomainFromEmail(attioPerson.email);
                  const canonicalKey = domain || attioCompany.name.toLowerCase().replace(/\s+/g, '-');

                  let org = await prisma.organization.findFirst({
                    where: {
                      OR: [
                        domain ? { domain } : {},
                        { canonicalKey },
                        { name: attioCompany.name },
                      ].filter(c => Object.keys(c).length > 0),
                    },
                  });

                  if (!org) {
                    org = await prisma.organization.create({
                      data: {
                        name: attioCompany.name,
                        canonicalKey,
                        domain,
                        description: attioCompany.description,
                        industry: attioCompany.industry,
                        city: attioCompany.city,
                        country: attioCompany.country,
                        organizationType: 'LP',
                      },
                    });
                    results.details.push(`Created organization: ${org.name}`);
                  }

                  organizationId = org.id;
                }
              }
            } else if (attioPerson) {
              // Person without email - create with LP name
              const personName = attioPerson.fullName || attioLP.name || 'Unknown LP';
              const person = await prisma.person.create({
                data: {
                  canonicalKey: `attio-lp-${parentId}`,
                  firstName: attioPerson.firstName || personName.split(' ')[0] || 'Unknown',
                  lastName: attioPerson.lastName || personName.split(' ').slice(1).join(' ') || '',
                  fullName: personName,
                  phone: attioPerson.phone || attioLP.phone,
                  linkedInUrl: attioPerson.linkedinUrl,
                  twitterHandle: attioPerson.twitterHandle,
                },
              });
              personId = person.id;
              results.details.push(`Created person (no email): ${person.fullName}`);
            }
          }

          // Process associated companies if no person was found
          if (!personId && attioLP.associatedCompanyIds.length > 0) {
            const attioCompany = await attioClient.getCompanyById(attioLP.associatedCompanyIds[0]);

            if (attioCompany && attioCompany.name) {
              const domain = attioCompany.domain;
              const canonicalKey = domain || attioCompany.name.toLowerCase().replace(/\s+/g, '-');

              let org = await prisma.organization.findFirst({
                where: {
                  OR: [
                    domain ? { domain } : {},
                    { canonicalKey },
                    { name: attioCompany.name },
                  ].filter(c => Object.keys(c).length > 0),
                },
              });

              if (!org) {
                org = await prisma.organization.create({
                  data: {
                    name: attioCompany.name,
                    canonicalKey,
                    domain,
                    description: attioCompany.description,
                    industry: attioCompany.industry,
                    city: attioCompany.city,
                    country: attioCompany.country,
                    organizationType: 'LP',
                  },
                });
                results.details.push(`Created organization: ${org.name}`);
              }

              organizationId = org.id;
            }
          }

          // If no person or company was found, create a person record from LP name
          if (!personId && !organizationId && attioLP.name) {
            const nameParts = attioLP.name.split(' ');
            const person = await prisma.person.create({
              data: {
                canonicalKey: `attio-lp-${parentId}`,
                firstName: nameParts[0] || 'Unknown',
                lastName: nameParts.slice(1).join(' ') || '',
                fullName: attioLP.name,
                phone: attioLP.phone,
              },
            });
            personId = person.id;
            results.details.push(`Created person from LP name: ${person.fullName}`);
          }
        } else if (parentType === 'people') {
          // Fetch the person details from Attio
          const people = await attioClient.listPeople(1000);
          const attioPerson = people.find(p => p.id === parentId);

          if (attioPerson && attioPerson.email) {
            // Find or create person by email
            let person = await prisma.person.findUnique({
              where: { email: attioPerson.email },
            });

            if (!person) {
              // Create the person
              person = await prisma.person.create({
                data: {
                  email: attioPerson.email,
                  canonicalKey: attioPerson.email.toLowerCase(),
                  firstName: attioPerson.firstName || 'Unknown',
                  lastName: attioPerson.lastName || '',
                  fullName: attioPerson.fullName || attioPerson.email,
                  phone: attioPerson.phone,
                  linkedInUrl: attioPerson.linkedinUrl,
                  twitterHandle: attioPerson.twitterHandle,
                  city: attioPerson.city,
                  country: attioPerson.country,
                },
              });
              results.details.push(`Created person: ${person.fullName}`);
            }

            personId = person.id;

            // If person has a company reference, try to create/link organization
            if (attioPerson.companyRecordId) {
              const attioCompany = await attioClient.getCompanyById(attioPerson.companyRecordId);
              if (attioCompany && attioCompany.name) {
                const domain = attioCompany.domain || extractDomainFromEmail(attioPerson.email);
                const canonicalKey = domain || attioCompany.name.toLowerCase().replace(/\s+/g, '-');

                let org = await prisma.organization.findFirst({
                  where: {
                    OR: [
                      domain ? { domain } : {},
                      { canonicalKey },
                      { name: attioCompany.name },
                    ].filter(c => Object.keys(c).length > 0),
                  },
                });

                if (!org) {
                  org = await prisma.organization.create({
                    data: {
                      name: attioCompany.name,
                      canonicalKey,
                      domain,
                      description: attioCompany.description,
                      industry: attioCompany.industry,
                      city: attioCompany.city,
                      country: attioCompany.country,
                      organizationType: 'LP',
                    },
                  });
                  results.details.push(`Created organization: ${org.name}`);
                }

                organizationId = org.id;
              }
            }
          } else if (attioPerson) {
            // Person without email - skip for now
            results.skipped++;
            results.details.push(`Skipped person without email: ${attioPerson.fullName || parentId}`);
            continue;
          }
        } else if (parentType === 'companies') {
          // Fetch the company details from Attio
          const attioCompany = await attioClient.getCompanyById(parentId);

          if (attioCompany && attioCompany.name) {
            const domain = attioCompany.domain;
            const canonicalKey = domain || attioCompany.name.toLowerCase().replace(/\s+/g, '-');

            let org = await prisma.organization.findFirst({
              where: {
                OR: [
                  domain ? { domain } : {},
                  { canonicalKey },
                  { name: attioCompany.name },
                ].filter(c => Object.keys(c).length > 0),
              },
            });

            if (!org) {
              org = await prisma.organization.create({
                data: {
                  name: attioCompany.name,
                  canonicalKey,
                  domain,
                  description: attioCompany.description,
                  industry: attioCompany.industry,
                  city: attioCompany.city,
                  country: attioCompany.country,
                  organizationType: 'LP',
                },
              });
              results.details.push(`Created organization: ${org.name}`);
            }

            organizationId = org.id;
          }
        }

        // Skip if we couldn't resolve either person or org
        if (!personId && !organizationId) {
          results.skipped++;
          results.details.push(`Skipped entry: could not resolve person or organization`);
          continue;
        }

        // Check if LP prospect already exists
        const existingProspect = await prisma.lPProspect.findFirst({
          where: {
            OR: [
              personId ? { personId } : {},
              organizationId ? { organizationId } : {},
            ].filter(c => Object.keys(c).length > 0),
          },
        });

        // Build combined notes with LP name context
        const combinedNotes = [
          lpName ? `Attio LP: ${lpName}` : null,
          notes,
        ].filter(Boolean).join('\n');

        if (existingProspect) {
          // Update existing prospect with Attio data
          await prisma.lPProspect.update({
            where: { id: existingProspect.id },
            data: {
              stage: mapAttioStageToLPStage(status),
              targetAmount: targetAmount || undefined,
              notes: combinedNotes || existingProspect.notes,
              sourceType: 'attio',
              sourceId: entry.id.entry_id,
              // Also update person/org links if we found new associations
              ...(personId && !existingProspect.personId ? { personId } : {}),
              ...(organizationId && !existingProspect.organizationId ? { organizationId } : {}),
            },
          });
          results.details.push(`Updated existing prospect: ${lpName || personId || organizationId}`);
          results.imported++;
        } else {
          // Create new LP prospect
          const prospect = await prisma.lPProspect.create({
            data: {
              personId: personId || undefined,
              organizationId: organizationId || undefined,
              stage: mapAttioStageToLPStage(status),
              targetAmount: targetAmount || undefined,
              notes: combinedNotes || null,
              fundName: 'Red Beard Ventures Fund II',
              sourceType: 'attio',
              sourceId: entry.id.entry_id,
              assignedToId: user.id,
            },
          });

          // Create initial stage history
          await prisma.lPStageHistory.create({
            data: {
              prospectId: prospect.id,
              fromStage: null,
              toStage: prospect.stage,
              changedById: user.id,
              notes: 'Imported from Attio',
            },
          });

          results.imported++;
        }
      } catch (error) {
        console.error('Error processing Attio entry:', error);
        results.errors++;
        results.details.push(`Error: ${String(error)}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.imported,
      skipped: results.skipped,
      errors: results.errors,
      totalEntries: entries.length,
      details: results.details.slice(0, 20), // Limit details to first 20
    });
  } catch (error) {
    console.error('Failed to import LPs from Attio:', error);
    return NextResponse.json(
      { error: 'Failed to import LPs from Attio', details: String(error) },
      { status: 500 }
    );
  }
}
