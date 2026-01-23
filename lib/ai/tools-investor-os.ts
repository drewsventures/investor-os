/**
 * Investor OS Brain AI Tools
 *
 * These tools enable the AI agent to query and manipulate the knowledge graph.
 * The AI can discover relationships, analyze risks, generate briefings, and
 * maintain the evolving network of people, organizations, and deals.
 */

import type { ToolDefinition } from './tools';

export const INVESTOR_OS_TOOLS: ToolDefinition[] = [
  // ============ ENTITY READ TOOLS ============

  {
    name: 'get_organization',
    description: 'Get comprehensive details about an organization including people, deals, conversations, facts, and metrics. Use this to prepare briefings or answer questions about a company.',
    input_schema: {
      type: 'object',
      properties: {
        organizationId: {
          type: 'string',
          description: 'Organization ID (if known)'
        },
        name: {
          type: 'string',
          description: 'Organization name (if ID unknown - will search by name)'
        },
        includeMetrics: {
          type: 'boolean',
          description: 'Include time-series metrics (MRR, ARR, burn, etc.) - defaults to true'
        },
        includePeople: {
          type: 'boolean',
          description: 'Include people/roles - defaults to true'
        },
        includeConversations: {
          type: 'boolean',
          description: 'Include recent conversations - defaults to true'
        }
      },
      required: []
    }
  },

  {
    name: 'get_person',
    description: 'Get details about a person including their roles, organizations, relationships, and conversation history. Use this for networking questions or preparing for meetings.',
    input_schema: {
      type: 'object',
      properties: {
        personId: {
          type: 'string',
          description: 'Person ID (if known)'
        },
        email: {
          type: 'string',
          description: 'Email address (if ID unknown)'
        },
        name: {
          type: 'string',
          description: 'Full name (if ID and email unknown)'
        },
        includeRelationships: {
          type: 'boolean',
          description: 'Include graph relationships - defaults to true'
        }
      },
      required: []
    }
  },

  {
    name: 'get_deal_pipeline',
    description: 'Get investment deals with their stages, valuations, and related information. Use this to answer questions about deal flow or specific opportunities.',
    input_schema: {
      type: 'object',
      properties: {
        stage: {
          type: 'string',
          enum: ['SOURCED', 'FIRST_CALL', 'DILIGENCE', 'PARTNER_REVIEW', 'TERM_SHEET', 'CLOSING', 'PASSED', 'PORTFOLIO'],
          description: 'Optional filter by stage'
        },
        organizationType: {
          type: 'string',
          enum: ['PORTFOLIO', 'PROSPECT'],
          description: 'Filter by organization type'
        }
      },
      required: []
    }
  },

  {
    name: 'get_recent_conversations',
    description: 'Get recent conversations about a specific entity (person, organization, or deal). Use this to understand recent activity and context.',
    input_schema: {
      type: 'object',
      properties: {
        entityType: {
          type: 'string',
          enum: ['person', 'organization', 'deal'],
          description: 'Type of entity'
        },
        entityId: {
          type: 'string',
          description: 'Entity ID'
        },
        limit: {
          type: 'number',
          description: 'Max results to return (default 10)'
        },
        daysBack: {
          type: 'number',
          description: 'Only include conversations from last N days (optional)'
        }
      },
      required: ['entityType', 'entityId']
    }
  },

  {
    name: 'search_knowledge_graph',
    description: 'Semantic search across all entities, conversations, and facts in the knowledge graph. Use this to find people, companies, or information when you don\'t have IDs.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (company name, person name, or keywords)'
        },
        entityTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['person', 'organization', 'deal', 'conversation']
          },
          description: 'Filter by entity types (optional)'
        },
        limit: {
          type: 'number',
          description: 'Max results to return (default 10)'
        }
      },
      required: ['query']
    }
  },

  {
    name: 'get_relationship_network',
    description: 'Get the network of relationships around an entity. Use this to find warm intro paths, co-investors, or understand connections between people and organizations.',
    input_schema: {
      type: 'object',
      properties: {
        sourceType: {
          type: 'string',
          enum: ['Person', 'Organization', 'Deal'],
          description: 'Source entity type'
        },
        sourceId: {
          type: 'string',
          description: 'Source entity ID'
        },
        relationshipType: {
          type: 'string',
          description: 'Optional filter by relationship type (e.g., WORKS_AT, KNOWS, INVESTED_IN)'
        },
        depth: {
          type: 'number',
          description: 'How many hops to traverse (1-3, default 1)'
        },
        minStrength: {
          type: 'number',
          description: 'Minimum relationship strength (0.0-1.0, default 0.5)'
        }
      },
      required: ['sourceType', 'sourceId']
    }
  },

  {
    name: 'get_metrics_timeseries',
    description: 'Get time-series metrics for an organization (MRR, ARR, burn rate, runway, team size, etc.). Use this to track performance trends.',
    input_schema: {
      type: 'object',
      properties: {
        organizationId: {
          type: 'string',
          description: 'Organization ID'
        },
        metricType: {
          type: 'string',
          description: 'Specific metric type to retrieve (e.g., MRR, ARR, burn_rate, runway, team_size)'
        },
        startDate: {
          type: 'string',
          description: 'Start date for time range (YYYY-MM-DD, optional)'
        },
        endDate: {
          type: 'string',
          description: 'End date for time range (YYYY-MM-DD, optional)'
        }
      },
      required: ['organizationId']
    }
  },

  // ============ ANALYSIS TOOLS ============

  {
    name: 'detect_risks',
    description: 'Analyze an organization or deal for risks, red flags, and concerns based on facts, metrics, and conversation history. Use this to surface potential issues.',
    input_schema: {
      type: 'object',
      properties: {
        organizationId: {
          type: 'string',
          description: 'Organization ID to analyze (provide either this or dealId)'
        },
        dealId: {
          type: 'string',
          description: 'Deal ID to analyze (provide either this or organizationId)'
        }
      },
      required: []
    }
  },

  {
    name: 'generate_briefing',
    description: 'Generate a comprehensive briefing for a person or organization including snapshot, key people, recent activity, metrics, risks, and recommended next actions. Use this for meeting prep.',
    input_schema: {
      type: 'object',
      properties: {
        entityType: {
          type: 'string',
          enum: ['person', 'organization'],
          description: 'Type of entity to brief on'
        },
        entityId: {
          type: 'string',
          description: 'Entity ID'
        },
        context: {
          type: 'string',
          description: 'Context for the briefing (e.g., "partner call tomorrow", "due diligence")'
        },
        includeRisks: {
          type: 'boolean',
          description: 'Include risk analysis - defaults to true'
        }
      },
      required: ['entityType', 'entityId']
    }
  },

  {
    name: 'find_warm_intro_path',
    description: 'Find warm introduction paths from a source person to a target person or organization. Returns possible paths with relationship strength scores.',
    input_schema: {
      type: 'object',
      properties: {
        sourcePersonId: {
          type: 'string',
          description: 'Starting person ID (usually the user)'
        },
        targetType: {
          type: 'string',
          enum: ['Person', 'Organization'],
          description: 'Target type'
        },
        targetId: {
          type: 'string',
          description: 'Target ID'
        },
        maxHops: {
          type: 'number',
          description: 'Maximum relationship hops (2-4, default 3)'
        }
      },
      required: ['sourcePersonId', 'targetType', 'targetId']
    }
  },

  // ============ WRITE TOOLS ============

  {
    name: 'add_fact',
    description: 'Add a new fact to the knowledge graph with automatic conflict detection. Use this when extracting information from conversations or updating entity data.',
    input_schema: {
      type: 'object',
      properties: {
        entityType: {
          type: 'string',
          enum: ['person', 'organization', 'deal', 'conversation'],
          description: 'Type of entity this fact is about'
        },
        entityId: {
          type: 'string',
          description: 'Entity ID'
        },
        factType: {
          type: 'string',
          description: 'Fact type (e.g., "metric", "note", "risk", "opportunity")'
        },
        key: {
          type: 'string',
          description: 'Fact key (e.g., "MRR", "team_size", "burn_rate", "notes")'
        },
        value: {
          type: 'string',
          description: 'Fact value (can be JSON string for complex data)'
        },
        sourceType: {
          type: 'string',
          description: 'Source of this fact (e.g., "manual", "fireflies", "email", "ai_extracted")'
        },
        sourceId: {
          type: 'string',
          description: 'Source ID (e.g., conversation ID, email ID)'
        },
        confidence: {
          type: 'number',
          description: 'Confidence score 0.0-1.0 (default 1.0 for manual, lower for AI-extracted)'
        }
      },
      required: ['entityType', 'entityId', 'factType', 'key', 'value', 'sourceType']
    }
  },

  {
    name: 'create_relationship',
    description: 'Create a new relationship (graph edge) between entities. Use this when discovering connections from conversations or enrichment. The AI can create new relationship types organically.',
    input_schema: {
      type: 'object',
      properties: {
        sourceType: {
          type: 'string',
          enum: ['Person', 'Organization', 'Deal', 'Investment'],
          description: 'Source entity type'
        },
        sourceId: {
          type: 'string',
          description: 'Source entity ID'
        },
        targetType: {
          type: 'string',
          enum: ['Person', 'Organization', 'Deal', 'Investment'],
          description: 'Target entity type'
        },
        targetId: {
          type: 'string',
          description: 'Target entity ID'
        },
        relationshipType: {
          type: 'string',
          description: 'Relationship type (e.g., WORKS_AT, FOUNDED, KNOWS, INVESTED_IN, INTRODUCED_BY, ADVISED, CO_INVESTED_WITH, etc.)'
        },
        properties: {
          type: 'string',
          description: 'Optional JSON string with relationship metadata (e.g., {"role": "CEO", "startDate": "2024-01-01"})'
        },
        strength: {
          type: 'number',
          description: 'Relationship strength 0.0-1.0 (default 1.0)'
        },
        confidence: {
          type: 'number',
          description: 'Confidence in this relationship 0.0-1.0 (default 1.0 for manual, lower for AI-extracted)'
        },
        sourceOfTruth: {
          type: 'string',
          description: 'Where this relationship came from (e.g., "manual", "ai_extracted", "linkedin", "fireflies")'
        },
        sourceIdRef: {
          type: 'string',
          description: 'Reference to source (e.g., conversation ID)'
        }
      },
      required: ['sourceType', 'sourceId', 'targetType', 'targetId', 'relationshipType', 'sourceOfTruth']
    }
  },

  {
    name: 'add_organization',
    description: 'Add a new organization to the knowledge graph with automatic deduplication. Use this when encountering a new company.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Organization name'
        },
        domain: {
          type: 'string',
          description: 'Company domain (e.g., "acmecorp.com")'
        },
        website: {
          type: 'string',
          description: 'Company website URL'
        },
        organizationType: {
          type: 'string',
          enum: ['PORTFOLIO', 'PROSPECT', 'LP', 'FUND', 'SERVICE_PROVIDER', 'OTHER'],
          description: 'Organization type'
        },
        industry: {
          type: 'string',
          description: 'Industry vertical (e.g., "DeFi", "Infrastructure", "Gaming")'
        },
        stage: {
          type: 'string',
          description: 'Funding stage (e.g., "Pre-seed", "Seed", "Series A")'
        },
        description: {
          type: 'string',
          description: 'Company description'
        }
      },
      required: ['name']
    }
  },

  {
    name: 'add_person',
    description: 'Add a new person to the knowledge graph with automatic deduplication by email. Use this when encountering a new contact.',
    input_schema: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          description: 'First name'
        },
        lastName: {
          type: 'string',
          description: 'Last name'
        },
        email: {
          type: 'string',
          description: 'Email address (used for deduplication)'
        },
        linkedInUrl: {
          type: 'string',
          description: 'LinkedIn profile URL'
        },
        twitterHandle: {
          type: 'string',
          description: 'Twitter handle'
        },
        phone: {
          type: 'string',
          description: 'Phone number'
        }
      },
      required: ['firstName', 'lastName']
    }
  },

  {
    name: 'create_deal',
    description: 'Create a new investment deal opportunity. Use this when tracking a new investment opportunity.',
    input_schema: {
      type: 'object',
      properties: {
        organizationId: {
          type: 'string',
          description: 'Organization ID (use get_organization or add_organization first if needed)'
        },
        name: {
          type: 'string',
          description: 'Deal name (e.g., "Acme Corp Seed Round")'
        },
        stage: {
          type: 'string',
          enum: ['SOURCED', 'FIRST_CALL', 'DILIGENCE', 'PARTNER_REVIEW', 'TERM_SHEET', 'CLOSING'],
          description: 'Current deal stage (default SOURCED)'
        },
        dealType: {
          type: 'string',
          enum: ['EQUITY', 'SAFE', 'CONVERTIBLE', 'TOKEN', 'OTHER'],
          description: 'Deal instrument type (default EQUITY)'
        },
        askAmount: {
          type: 'number',
          description: 'Amount they are raising'
        },
        ourAllocation: {
          type: 'number',
          description: 'Amount we plan to invest'
        },
        valuation: {
          type: 'number',
          description: 'Company valuation'
        },
        valuationType: {
          type: 'string',
          enum: ['pre', 'post', 'cap'],
          description: 'Valuation type (pre-money, post-money, or cap)'
        },
        expectedCloseDate: {
          type: 'string',
          description: 'Expected close date (YYYY-MM-DD)'
        }
      },
      required: ['organizationId', 'name']
    }
  },

  {
    name: 'update_deal_stage',
    description: 'Move a deal to a different stage in the pipeline. Use this to track deal progression.',
    input_schema: {
      type: 'object',
      properties: {
        dealId: {
          type: 'string',
          description: 'Deal ID'
        },
        newStage: {
          type: 'string',
          enum: ['SOURCED', 'FIRST_CALL', 'DILIGENCE', 'PARTNER_REVIEW', 'TERM_SHEET', 'CLOSING', 'PASSED', 'PORTFOLIO'],
          description: 'New stage'
        },
        notes: {
          type: 'string',
          description: 'Optional notes about the stage change'
        }
      },
      required: ['dealId', 'newStage']
    }
  },

  {
    name: 'create_task',
    description: 'Create an action item or task related to a person, organization, or deal. Use this for tracking follow-ups.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Task title'
        },
        description: {
          type: 'string',
          description: 'Detailed task description'
        },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          description: 'Task priority (default MEDIUM)'
        },
        dueDate: {
          type: 'string',
          description: 'Due date (YYYY-MM-DD, optional)'
        },
        assignedToPersonId: {
          type: 'string',
          description: 'Person ID to assign task to (optional)'
        },
        relatedOrganizationId: {
          type: 'string',
          description: 'Related organization ID (optional)'
        },
        relatedDealId: {
          type: 'string',
          description: 'Related deal ID (optional)'
        },
        sourceConversationId: {
          type: 'string',
          description: 'Conversation this task came from (optional)'
        }
      },
      required: ['title']
    }
  }
];

// Convert to Anthropic tool format
export function getInvestorOSAnthropicTools() {
  return INVESTOR_OS_TOOLS.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema
  }));
}

// Convert to OpenAI function calling format
export function getInvestorOSOpenAITools() {
  return INVESTOR_OS_TOOLS.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema
    }
  }));
}

// Combined tools (CFO + Investor OS)
export function getAllAnthropicTools() {
  const { getAnthropicTools } = require('./tools');
  return [
    ...getAnthropicTools(),
    ...getInvestorOSAnthropicTools()
  ];
}
