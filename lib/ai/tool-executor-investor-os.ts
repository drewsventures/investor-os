/**
 * Investor OS Tool Executor
 *
 * Implements all Investor OS AI tools for querying and manipulating
 * the knowledge graph.
 */

import { prisma } from '@/lib/db';
import {
  resolveOrCreatePerson,
  resolveOrCreateOrganization,
  type PersonInput,
  type OrganizationInput
} from '../normalization/entity-resolver';
import {
  addFactWithConflictDetection,
  type FactInput
} from '../normalization/conflict-resolution';

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============================================================================
// ENTITY READ OPERATIONS
// ============================================================================

export async function getOrganization(input: {
  organizationId?: string;
  name?: string;
  includeMetrics?: boolean;
  includePeople?: boolean;
  includeConversations?: boolean;
}): Promise<ToolResult> {
  try {
    const {
      organizationId,
      name,
      includeMetrics = true,
      includePeople = true,
      includeConversations = true
    } = input;

    // Find organization by ID or name
    let org;
    if (organizationId) {
      org = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          deals: true,
          investments: true,
          facts: {
            where: { validUntil: null }, // Only current facts
            orderBy: { validFrom: 'desc' }
          },
          metrics: includeMetrics ? {
            orderBy: { snapshotDate: 'desc' },
            take: 50 // Last 50 data points
          } : false,
          conversations: includeConversations ? {
            orderBy: { conversationDate: 'desc' },
            take: 10
          } : false
        }
      });
    } else if (name) {
      org = await prisma.organization.findFirst({
        where: {
          OR: [
            { name: { contains: name, mode: 'insensitive' } },
            { canonicalKey: { contains: name.toLowerCase() } }
          ]
        },
        include: {
          deals: true,
          investments: true,
          facts: {
            where: { validUntil: null },
            orderBy: { validFrom: 'desc' }
          },
          metrics: includeMetrics ? {
            orderBy: { snapshotDate: 'desc' },
            take: 50
          } : false,
          conversations: includeConversations ? {
            orderBy: { conversationDate: 'desc' },
            take: 10
          } : false
        }
      });
    } else {
      return { success: false, error: 'Must provide organizationId or name' };
    }

    if (!org) {
      return { success: false, error: 'Organization not found' };
    }

    // Get relationships (people at this org)
    let relationships = null;
    if (includePeople) {
      relationships = await prisma.relationship.findMany({
        where: {
          OR: [
            { targetType: 'Organization', targetId: org.id },
            { sourceType: 'Organization', sourceId: org.id }
          ],
          isActive: true
        },
        orderBy: { strength: 'desc' }
      });

      // Get person details for WORKS_AT relationships
      const personIds = relationships
        .filter(r => r.relationshipType === 'WORKS_AT' && r.sourceType === 'Person')
        .map(r => r.sourceId);

      if (personIds.length > 0) {
        const people = await prisma.person.findMany({
          where: { id: { in: personIds } },
          select: {
            id: true,
            fullName: true,
            email: true,
            linkedInUrl: true
          }
        });

        // Attach people to org response
        (org as any).people = people.map(p => {
          const rel = relationships.find(r => r.sourceId === p.id);
          return {
            ...p,
            role: (rel?.properties as any)?.role || 'Unknown',
            startDate: (rel?.properties as any)?.startDate
          };
        });
      }
    }

    // Format facts by type for easier consumption
    const factsByType: Record<string, any[]> = {};
    org.facts.forEach(fact => {
      if (!factsByType[fact.factType]) {
        factsByType[fact.factType] = [];
      }
      factsByType[fact.factType].push({
        key: fact.key,
        value: fact.value,
        sourceType: fact.sourceType,
        confidence: Number(fact.confidence),
        validFrom: fact.validFrom
      });
    });

    return {
      success: true,
      data: {
        ...org,
        relationships: includePeople ? relationships : undefined,
        factsByType
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getPerson(input: {
  personId?: string;
  email?: string;
  name?: string;
  includeRelationships?: boolean;
}): Promise<ToolResult> {
  try {
    const { personId, email, name, includeRelationships = true } = input;

    // Find person
    let person;
    if (personId) {
      person = await prisma.person.findUnique({
        where: { id: personId },
        include: {
          facts: {
            where: { validUntil: null },
            orderBy: { validFrom: 'desc' }
          },
          conversations: {
            orderBy: { conversationDate: 'desc' },
            take: 10
          },
          lpCommitments: true
        }
      });
    } else if (email) {
      person = await prisma.person.findUnique({
        where: { email },
        include: {
          facts: {
            where: { validUntil: null },
            orderBy: { validFrom: 'desc' }
          },
          conversations: {
            orderBy: { conversationDate: 'desc' },
            take: 10
          },
          lpCommitments: true
        }
      });
    } else if (name) {
      person = await prisma.person.findFirst({
        where: {
          OR: [
            { fullName: { contains: name, mode: 'insensitive' } },
            { canonicalKey: { contains: name.toLowerCase() } }
          ]
        },
        include: {
          facts: {
            where: { validUntil: null },
            orderBy: { validFrom: 'desc' }
          },
          conversations: {
            orderBy: { conversationDate: 'desc' },
            take: 10
          },
          lpCommitments: true
        }
      });
    } else {
      return { success: false, error: 'Must provide personId, email, or name' };
    }

    if (!person) {
      return { success: false, error: 'Person not found' };
    }

    // Get relationships
    let relationships = null;
    if (includeRelationships) {
      relationships = await prisma.relationship.findMany({
        where: {
          OR: [
            { sourceType: 'Person', sourceId: person.id },
            { targetType: 'Person', targetId: person.id }
          ],
          isActive: true
        },
        orderBy: { strength: 'desc' }
      });

      // Get organization details for WORKS_AT relationships
      const orgIds = relationships
        .filter(r => r.relationshipType === 'WORKS_AT' && r.targetType === 'Organization')
        .map(r => r.targetId);

      if (orgIds.length > 0) {
        const orgs = await prisma.organization.findMany({
          where: { id: { in: orgIds } },
          select: {
            id: true,
            name: true,
            domain: true,
            organizationType: true,
            industry: true
          }
        });

        (person as any).organizations = orgs.map(o => {
          const rel = relationships.find(r => r.targetId === o.id);
          return {
            ...o,
            role: (rel?.properties as any)?.role || 'Unknown',
            isCurrentRole: rel?.isActive
          };
        });
      }
    }

    return {
      success: true,
      data: {
        ...person,
        relationships: includeRelationships ? relationships : undefined
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getDealPipeline(input: {
  stage?: string;
  organizationType?: string;
}): Promise<ToolResult> {
  try {
    const where: any = {};
    if (input.stage) where.stage = input.stage;

    const deals = await prisma.deal.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            organizationType: true,
            industry: true,
            stage: true
          }
        },
        facts: {
          where: { validUntil: null },
          orderBy: { validFrom: 'desc' }
        }
      },
      orderBy: [
        { stage: 'asc' },
        { expectedCloseDate: 'asc' }
      ]
    });

    // Filter by organizationType if provided
    const filteredDeals = input.organizationType
      ? deals.filter(d => d.organization.organizationType === input.organizationType)
      : deals;

    return {
      success: true,
      data: filteredDeals
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getRecentConversations(input: {
  entityType: string;
  entityId: string;
  limit?: number;
  daysBack?: number;
}): Promise<ToolResult> {
  try {
    const { entityType, entityId, limit = 10, daysBack } = input;

    const where: any = {};

    // Filter by date if specified
    if (daysBack) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      where.conversationDate = { gte: cutoffDate };
    }

    let conversations;

    if (entityType === 'organization') {
      conversations = await prisma.conversation.findMany({
        where: {
          ...where,
          organizations: {
            some: { id: entityId }
          }
        },
        orderBy: { conversationDate: 'desc' },
        take: limit,
        include: {
          participants: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          facts: {
            where: { validUntil: null }
          }
        }
      });
    } else if (entityType === 'person') {
      conversations = await prisma.conversation.findMany({
        where: {
          ...where,
          participants: {
            some: { id: entityId }
          }
        },
        orderBy: { conversationDate: 'desc' },
        take: limit,
        include: {
          participants: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          facts: {
            where: { validUntil: null }
          }
        }
      });
    } else if (entityType === 'deal') {
      conversations = await prisma.conversation.findMany({
        where: {
          ...where,
          deals: {
            some: { id: entityId }
          }
        },
        orderBy: { conversationDate: 'desc' },
        take: limit,
        include: {
          participants: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          facts: {
            where: { validUntil: null }
          }
        }
      });
    } else {
      return { success: false, error: 'Invalid entityType' };
    }

    return {
      success: true,
      data: conversations
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function searchKnowledgeGraph(input: {
  query: string;
  entityTypes?: string[];
  limit?: number;
}): Promise<ToolResult> {
  try {
    const { query, entityTypes, limit = 10 } = input;
    const results: any = {
      people: [],
      organizations: [],
      deals: [],
      conversations: []
    };

    // Search people
    if (!entityTypes || entityTypes.includes('person')) {
      results.people = await prisma.person.findMany({
        where: {
          OR: [
            { fullName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: limit,
        select: {
          id: true,
          fullName: true,
          email: true,
          privacyTier: true
        }
      });
    }

    // Search organizations
    if (!entityTypes || entityTypes.includes('organization')) {
      results.organizations = await prisma.organization.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { domain: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: limit,
        select: {
          id: true,
          name: true,
          domain: true,
          organizationType: true,
          industry: true,
          stage: true
        }
      });
    }

    // Search deals
    if (!entityTypes || entityTypes.includes('deal')) {
      results.deals = await prisma.deal.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' }
        },
        take: limit,
        include: {
          organization: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    }

    // Search conversations
    if (!entityTypes || entityTypes.includes('conversation')) {
      results.conversations = await prisma.conversation.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { summary: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: limit,
        select: {
          id: true,
          title: true,
          conversationDate: true,
          medium: true,
          summary: true
        }
      });
    }

    return {
      success: true,
      data: results
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getRelationshipNetwork(input: {
  sourceType: string;
  sourceId: string;
  relationshipType?: string;
  depth?: number;
  minStrength?: number;
}): Promise<ToolResult> {
  try {
    const { sourceType, sourceId, relationshipType, depth = 1, minStrength = 0.5 } = input;

    // Get direct relationships
    const where: any = {
      OR: [
        { sourceType, sourceId },
        { targetType: sourceType, targetId: sourceId }
      ],
      isActive: true,
      strength: { gte: minStrength }
    };

    if (relationshipType) {
      where.relationshipType = relationshipType;
    }

    const relationships = await prisma.relationship.findMany({
      where,
      orderBy: { strength: 'desc' }
    });

    // If depth > 1, get relationships of relationships (multi-hop)
    let secondHopRels: any[] = [];
    if (depth > 1 && relationships.length > 0) {
      const connectedEntityIds = relationships.map(r =>
        r.sourceId === sourceId ? r.targetId : r.sourceId
      );

      secondHopRels = await prisma.relationship.findMany({
        where: {
          OR: [
            { sourceId: { in: connectedEntityIds } },
            { targetId: { in: connectedEntityIds } }
          ],
          isActive: true,
          strength: { gte: minStrength }
        },
        orderBy: { strength: 'desc' },
        take: 100 // Limit to avoid excessive data
      });
    }

    return {
      success: true,
      data: {
        directRelationships: relationships,
        secondHopRelationships: depth > 1 ? secondHopRels : [],
        networkSize: relationships.length + (depth > 1 ? secondHopRels.length : 0)
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getMetricsTimeseries(input: {
  organizationId: string;
  metricType?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ToolResult> {
  try {
    const { organizationId, metricType, startDate, endDate } = input;

    const where: any = { organizationId };
    if (metricType) where.metricType = metricType;

    if (startDate || endDate) {
      where.snapshotDate = {};
      if (startDate) where.snapshotDate.gte = new Date(startDate);
      if (endDate) where.snapshotDate.lte = new Date(endDate);
    }

    const metrics = await prisma.organizationMetric.findMany({
      where,
      orderBy: { snapshotDate: 'asc' }
    });

    // Group by metric type
    const metricsByType: Record<string, any[]> = {};
    metrics.forEach(m => {
      if (!metricsByType[m.metricType]) {
        metricsByType[m.metricType] = [];
      }
      metricsByType[m.metricType].push({
        date: m.snapshotDate,
        value: Number(m.value),
        unit: m.unit,
        sourceType: m.sourceType,
        confidence: Number(m.confidence)
      });
    });

    return {
      success: true,
      data: {
        metrics: metricsByType,
        totalDataPoints: metrics.length,
        metricTypes: Object.keys(metricsByType)
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// ANALYSIS OPERATIONS
// ============================================================================

export async function detectRisks(input: {
  organizationId?: string;
  dealId?: string;
}): Promise<ToolResult> {
  try {
    const { organizationId, dealId } = input;
    const risks: any[] = [];

    if (organizationId) {
      // Get organization with metrics and facts
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          metrics: {
            orderBy: { snapshotDate: 'desc' },
            take: 50
          },
          facts: {
            where: { validUntil: null },
            orderBy: { validFrom: 'desc' }
          },
          conversations: {
            orderBy: { conversationDate: 'desc' },
            take: 10
          }
        }
      });

      if (!org) {
        return { success: false, error: 'Organization not found' };
      }

      // Risk: Low runway
      const runwayMetrics = org.metrics.filter(m => m.metricType === 'runway');
      if (runwayMetrics.length > 0) {
        const latestRunway = Number(runwayMetrics[0].value);
        if (latestRunway < 6) {
          risks.push({
            type: 'low_runway',
            severity: latestRunway < 3 ? 'HIGH' : 'MEDIUM',
            message: `Runway is only ${latestRunway.toFixed(1)} months`,
            evidence: `Latest runway metric: ${latestRunway.toFixed(1)} months (${runwayMetrics[0].snapshotDate})`,
            recommendation: 'Ask about fundraising plans and current burn rate'
          });
        }
      }

      // Risk: Burn rate increasing
      const burnMetrics = org.metrics.filter(m => m.metricType === 'burn_rate')
        .sort((a, b) => b.snapshotDate.getTime() - a.snapshotDate.getTime())
        .slice(0, 3);

      if (burnMetrics.length >= 2) {
        const latest = Number(burnMetrics[0].value);
        const previous = Number(burnMetrics[1].value);
        const increase = ((latest - previous) / previous) * 100;

        if (increase > 30) {
          risks.push({
            type: 'burn_spike',
            severity: 'MEDIUM',
            message: `Burn rate increased ${increase.toFixed(0)}% recently`,
            evidence: `Burn increased from $${previous.toFixed(0)} to $${latest.toFixed(0)}`,
            recommendation: 'Understand what drove the burn increase'
          });
        }
      }

      // Risk: Stale update (no conversations in > 60 days)
      const lastConversation = org.conversations[0];
      if (lastConversation) {
        const daysSince = Math.floor(
          (Date.now() - lastConversation.conversationDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince > 60) {
          risks.push({
            type: 'stale_relationship',
            severity: 'LOW',
            message: `No contact in ${daysSince} days`,
            evidence: `Last conversation: ${lastConversation.conversationDate.toISOString().split('T')[0]}`,
            recommendation: 'Schedule a check-in call'
          });
        }
      }

      // Risk: Red flag facts
      const riskFacts = org.facts.filter(f => f.factType === 'risk');
      riskFacts.forEach(f => {
        risks.push({
          type: 'manual_flag',
          severity: 'MEDIUM',
          message: `Risk noted: ${f.key}`,
          evidence: f.value,
          source: f.sourceType
        });
      });
    }

    if (dealId) {
      // Get deal with organization
      const deal = await prisma.deal.findUnique({
        where: { id: dealId },
        include: {
          organization: {
            include: {
              metrics: {
                orderBy: { snapshotDate: 'desc' },
                take: 10
              },
              facts: {
                where: { validUntil: null }
              }
            }
          },
          facts: {
            where: { validUntil: null }
          }
        }
      });

      if (!deal) {
        return { success: false, error: 'Deal not found' };
      }

      // Risk: Valuation concerns
      if (deal.valuation && deal.organization.metrics.length > 0) {
        const mrr = deal.organization.metrics.find(m => m.metricType === 'MRR');
        if (mrr) {
          const mrrValue = Number(mrr.value);
          const arr = mrrValue * 12;
          const multiple = Number(deal.valuation) / arr;

          if (multiple > 100) {
            risks.push({
              type: 'high_valuation',
              severity: 'MEDIUM',
              message: `Valuation is ${multiple.toFixed(1)}x ARR`,
              evidence: `Valuation $${Number(deal.valuation).toLocaleString()}, ARR ~$${arr.toLocaleString()}`,
              recommendation: 'Justify valuation with growth rate or market dynamics'
            });
          }
        }
      }

      // Risk: Deal sitting too long
      if (deal.firstContactDate) {
        const daysInPipeline = Math.floor(
          (Date.now() - deal.firstContactDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysInPipeline > 180 && deal.stage !== 'PASSED') {
          risks.push({
            type: 'stale_deal',
            severity: 'LOW',
            message: `Deal has been in pipeline for ${daysInPipeline} days`,
            evidence: `First contact: ${deal.firstContactDate.toISOString().split('T')[0]}`,
            recommendation: 'Move to decision or pass'
          });
        }
      }
    }

    return {
      success: true,
      data: {
        risks,
        riskCount: risks.length,
        highSeverityCount: risks.filter(r => r.severity === 'HIGH').length,
        mediumSeverityCount: risks.filter(r => r.severity === 'MEDIUM').length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function generateBriefing(input: {
  entityType: string;
  entityId: string;
  context?: string;
  includeRisks?: boolean;
}): Promise<ToolResult> {
  try {
    const { entityType, entityId, context, includeRisks = true } = input;

    if (entityType === 'organization') {
      const orgResult = await getOrganization({
        organizationId: entityId,
        includeMetrics: true,
        includePeople: true,
        includeConversations: true
      });

      if (!orgResult.success) {
        return orgResult;
      }

      const org = orgResult.data as any;

      // Generate risks if requested
      let risks = null;
      if (includeRisks) {
        const riskResult = await detectRisks({ organizationId: entityId });
        if (riskResult.success) {
          risks = riskResult.data;
        }
      }

      // Format briefing
      const briefing = {
        entity: {
          name: org.name,
          type: org.organizationType,
          industry: org.industry,
          stage: org.stage
        },
        snapshot: {
          description: org.description,
          website: org.website,
          domain: org.domain
        },
        keyPeople: org.people || [],
        recentActivity: {
          lastConversation: org.conversations?.[0] || null,
          conversationCount: org.conversations?.length || 0
        },
        metrics: org.factsByType?.metric || [],
        deals: org.deals.map((d: any) => ({
          id: d.id,
          name: d.name,
          stage: d.stage,
          valuation: d.valuation,
          ourAllocation: d.ourAllocation
        })),
        risks: risks?.risks || [],
        recommendations: generateRecommendations(org, risks, context)
      };

      return {
        success: true,
        data: briefing
      };
    } else if (entityType === 'person') {
      const personResult = await getPerson({
        personId: entityId,
        includeRelationships: true
      });

      if (!personResult.success) {
        return personResult;
      }

      const person = personResult.data as any;

      const briefing = {
        entity: {
          name: person.fullName,
          email: person.email,
          linkedIn: person.linkedInUrl,
          twitter: person.twitterHandle
        },
        organizations: person.organizations || [],
        recentActivity: {
          lastContacted: person.lastContactedAt,
          conversationCount: person.conversations?.length || 0
        },
        lpCommitments: person.lpCommitments || [],
        recommendations: generatePersonRecommendations(person, context)
      };

      return {
        success: true,
        data: briefing
      };
    }

    return { success: false, error: 'Invalid entityType' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function generateRecommendations(org: any, risks: any, context?: string): string[] {
  const recs: string[] = [];

  // Context-specific recommendations
  if (context?.toLowerCase().includes('diligence')) {
    recs.push('Review latest financial metrics and ask about unit economics');
    recs.push('Validate key customer claims and retention data');
  }

  if (context?.toLowerCase().includes('partner call')) {
    recs.push('Prepare questions about recent progress since last conversation');
  }

  // Risk-driven recommendations
  if (risks?.risks) {
    risks.risks.forEach((risk: any) => {
      if (risk.recommendation) {
        recs.push(risk.recommendation);
      }
    });
  }

  // Default recommendations
  if (recs.length === 0) {
    recs.push('Review recent conversation history before engaging');
    if (org.people && org.people.length > 0) {
      recs.push(`Confirm primary contact (currently: ${org.people[0].fullName})`);
    }
  }

  return recs;
}

function generatePersonRecommendations(person: any, context?: string): string[] {
  const recs: string[] = [];

  if (context?.toLowerCase().includes('intro')) {
    recs.push('Check mutual connections via relationship network');
    recs.push('Review recent conversation history for context');
  }

  if (person.organizations && person.organizations.length > 0) {
    const currentOrgs = person.organizations.filter((o: any) => o.isCurrentRole);
    if (currentOrgs.length > 0) {
      recs.push(`Currently at: ${currentOrgs.map((o: any) => o.name).join(', ')}`);
    }
  }

  return recs;
}

export async function findWarmIntroPath(input: {
  sourcePersonId: string;
  targetType: string;
  targetId: string;
  maxHops?: number;
}): Promise<ToolResult> {
  try {
    const { sourcePersonId, targetType, targetId, maxHops = 3 } = input;

    // Get 1st hop: people source KNOWS
    const firstHop = await prisma.relationship.findMany({
      where: {
        sourceType: 'Person',
        sourceId: sourcePersonId,
        relationshipType: { in: ['KNOWS', 'WORKED_WITH', 'INTRODUCED_BY'] },
        isActive: true
      }
    });

    const paths: any[] = [];

    // For each person in 1st hop, check if they can reach target
    for (const rel1 of firstHop) {
      const intermediateId = rel1.targetId;

      // Check direct connection to target
      const directToTarget = await prisma.relationship.findFirst({
        where: {
          sourceType: 'Person',
          sourceId: intermediateId,
          targetType,
          targetId,
          isActive: true
        }
      });

      if (directToTarget) {
        // Found 2-hop path
        const intermediatePerson = await prisma.person.findUnique({
          where: { id: intermediateId },
          select: { id: true, fullName: true, email: true }
        });

        paths.push({
          hops: 2,
          path: [sourcePersonId, intermediateId, targetId],
          strength: Number(rel1.strength) * Number(directToTarget.strength),
          intermediary: intermediatePerson,
          relationshipTypes: [rel1.relationshipType, directToTarget.relationshipType]
        });
      }
    }

    // Sort by strength
    paths.sort((a, b) => b.strength - a.strength);

    return {
      success: true,
      data: {
        paths: paths.slice(0, 5), // Top 5 paths
        pathCount: paths.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

export async function addFact(input: {
  entityType: string;
  entityId: string;
  factType: string;
  key: string;
  value: string;
  sourceType: string;
  sourceId?: string;
  confidence?: number;
}): Promise<ToolResult> {
  try {
    const factInput: FactInput = {
      factType: input.factType,
      key: input.key,
      value: input.value,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      confidence: input.confidence || 1.0
    };

    // Map entity to correct ID field
    if (input.entityType === 'person') {
      factInput.personId = input.entityId;
    } else if (input.entityType === 'organization') {
      factInput.organizationId = input.entityId;
    } else if (input.entityType === 'deal') {
      factInput.dealId = input.entityId;
    } else if (input.entityType === 'conversation') {
      factInput.conversationId = input.entityId;
    } else {
      return { success: false, error: 'Invalid entityType' };
    }

    const result = await addFactWithConflictDetection(factInput);

    if (result.requiresManualReview) {
      return {
        success: false,
        error: 'Conflict detected - manual review required',
        data: result.conflict
      };
    }

    return {
      success: true,
      data: {
        factId: result.factId,
        conflict: result.conflict,
        resolution: result.resolution
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function createRelationship(input: {
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  relationshipType: string;
  properties?: string;
  strength?: number;
  confidence?: number;
  sourceOfTruth: string;
  sourceIdRef?: string;
}): Promise<ToolResult> {
  try {
    const {
      sourceType,
      sourceId,
      targetType,
      targetId,
      relationshipType,
      properties,
      strength = 1.0,
      confidence = 1.0,
      sourceOfTruth,
      sourceIdRef
    } = input;

    // Parse properties if string
    let props = null;
    if (properties) {
      try {
        props = JSON.parse(properties);
      } catch {
        props = { raw: properties };
      }
    }

    const relationship = await prisma.relationship.create({
      data: {
        sourceType,
        sourceId,
        targetType,
        targetId,
        relationshipType,
        properties: props,
        strength,
        confidence,
        sourceOfTruth,
        sourceId_ref: sourceIdRef,
        isActive: true,
        validFrom: new Date()
      }
    });

    return {
      success: true,
      data: relationship
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function addOrganization(input: OrganizationInput): Promise<ToolResult> {
  try {
    const result = await resolveOrCreateOrganization(input, true);

    return {
      success: true,
      data: {
        organization: result.organization,
        isNew: result.isNew,
        wasUpdated: result.wasUpdated
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function addPerson(input: PersonInput): Promise<ToolResult> {
  try {
    const result = await resolveOrCreatePerson(input, true);

    return {
      success: true,
      data: {
        person: result.person,
        isNew: result.isNew,
        wasUpdated: result.wasUpdated
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function createDeal(input: {
  organizationId: string;
  name: string;
  stage?: string;
  dealType?: string;
  askAmount?: number;
  ourAllocation?: number;
  valuation?: number;
  valuationType?: string;
  expectedCloseDate?: string;
}): Promise<ToolResult> {
  try {
    const deal = await prisma.deal.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        stage: (input.stage as any) || 'SOURCED',
        dealType: (input.dealType as any) || 'EQUITY',
        askAmount: input.askAmount,
        ourAllocation: input.ourAllocation,
        valuation: input.valuation,
        valuationType: input.valuationType,
        expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
        firstContactDate: new Date()
      },
      include: {
        organization: true
      }
    });

    return {
      success: true,
      data: deal
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function updateDealStage(input: {
  dealId: string;
  newStage: string;
  notes?: string;
}): Promise<ToolResult> {
  try {
    const deal = await prisma.deal.update({
      where: { id: input.dealId },
      data: {
        stage: input.newStage as any
      },
      include: {
        organization: true
      }
    });

    // Add note as fact if provided
    if (input.notes) {
      await prisma.fact.create({
        data: {
          dealId: input.dealId,
          factType: 'note',
          key: 'stage_change',
          value: input.notes,
          sourceType: 'manual',
          confidence: 1.0
        }
      });
    }

    return {
      success: true,
      data: deal
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function createTask(input: {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  assignedToPersonId?: string;
  relatedOrganizationId?: string;
  relatedDealId?: string;
  sourceConversationId?: string;
}): Promise<ToolResult> {
  try {
    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        priority: (input.priority as any) || 'MEDIUM',
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        assignedToPersonId: input.assignedToPersonId,
        relatedOrganizationId: input.relatedOrganizationId,
        relatedDealId: input.relatedDealId,
        sourceConversationId: input.sourceConversationId,
        status: 'OPEN'
      }
    });

    return {
      success: true,
      data: task
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
