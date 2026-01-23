/**
 * AI CFO Tools - Defines the tools available to the AI CFO agent
 * These tools allow the AI to read financial data and make controlled updates
 */

// Tool definition type compatible with both Anthropic and OpenAI
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const CFO_TOOLS: ToolDefinition[] = [
  // ============ READ TOOLS ============
  {
    name: 'get_dashboard_summary',
    description: 'Get current financial dashboard summary including total cash, burn rate, runway, YTD revenue and expenses. Use this to answer questions about overall financial health.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_team_data',
    description: 'Get current team members with their roles, departments, and compensation details. Use this to answer questions about headcount, team costs, or to find a team member ID before updating.',
    input_schema: {
      type: 'object',
      properties: {
        department: {
          type: 'string',
          description: 'Optional filter by department: Accelerator, Operations, Strategy, or Talent'
        }
      },
      required: []
    }
  },
  {
    name: 'get_pipeline_deals',
    description: 'Get sales pipeline deals with their stages, values, and probabilities. Use this to answer questions about revenue pipeline or to find a deal ID before updating.',
    input_schema: {
      type: 'object',
      properties: {
        stage: {
          type: 'string',
          description: 'Optional filter by stage: lead, qualified, proposal, negotiation, committed, closed_won, closed_lost'
        }
      },
      required: []
    }
  },
  {
    name: 'get_projections',
    description: 'Get revenue and expense projections for the next 12 months, including committed revenue, pipeline revenue, and manual overrides.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_accounts',
    description: 'Get list of bank accounts and their current balances.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  // ============ WRITE TOOLS - Team Management ============
  {
    name: 'add_team_member',
    description: 'Add a new team member (contractor or employee) to the organization. Use this when the user wants to add someone to the team.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Full name of the team member'
        },
        role: {
          type: 'string',
          description: 'Job title or role (e.g., "Software Engineer", "Marketing Manager")'
        },
        department: {
          type: 'string',
          enum: ['Accelerator', 'Operations', 'Strategy', 'Talent'],
          description: 'Department the person belongs to'
        },
        type: {
          type: 'string',
          enum: ['contractor', 'employee'],
          description: 'Employment type - defaults to contractor'
        },
        monthlyRate: {
          type: 'number',
          description: 'Monthly compensation in USD'
        },
        startDate: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format'
        },
        notes: {
          type: 'string',
          description: 'Optional notes about the team member'
        }
      },
      required: ['name', 'role', 'department', 'monthlyRate', 'startDate']
    }
  },
  {
    name: 'update_team_member',
    description: 'Update an existing team member. First use get_team_data to find their ID.',
    input_schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Team member ID (get this from get_team_data first)'
        },
        name: { type: 'string', description: 'Updated name' },
        role: { type: 'string', description: 'Updated role' },
        department: {
          type: 'string',
          enum: ['Accelerator', 'Operations', 'Strategy', 'Talent'],
          description: 'Updated department'
        },
        type: {
          type: 'string',
          enum: ['contractor', 'employee'],
          description: 'Updated employment type'
        },
        monthlyRate: { type: 'number', description: 'Updated monthly rate' },
        notes: { type: 'string', description: 'Updated notes' }
      },
      required: ['id']
    }
  },
  {
    name: 'remove_team_member',
    description: 'Remove a team member (soft delete - sets them as inactive). First use get_team_data to find their ID.',
    input_schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Team member ID to remove'
        }
      },
      required: ['id']
    }
  },

  // ============ WRITE TOOLS - Pipeline Management ============
  {
    name: 'add_pipeline_deal',
    description: 'Add a new deal to the sales pipeline.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Deal or opportunity name'
        },
        clientName: {
          type: 'string',
          description: 'Client or prospect company name'
        },
        dealValue: {
          type: 'number',
          description: 'Total deal value in USD'
        },
        stage: {
          type: 'string',
          enum: ['lead', 'qualified', 'proposal', 'negotiation', 'committed'],
          description: 'Pipeline stage - defaults to lead'
        },
        probability: {
          type: 'number',
          description: 'Win probability 0-100 (defaults based on stage)'
        },
        expectedCloseDate: {
          type: 'string',
          description: 'Expected close date in YYYY-MM-DD format'
        },
        dealType: {
          type: 'string',
          enum: ['one-time', 'recurring'],
          description: 'Whether this is a one-time or recurring deal'
        },
        recurringFrequency: {
          type: 'string',
          enum: ['monthly', 'annually'],
          description: 'For recurring deals, the billing frequency'
        },
        contractLength: {
          type: 'number',
          description: 'Contract length in months (for recurring deals)'
        },
        notes: { type: 'string', description: 'Optional notes about the deal' }
      },
      required: ['name', 'clientName', 'dealValue', 'expectedCloseDate']
    }
  },
  {
    name: 'update_pipeline_deal',
    description: 'Update an existing pipeline deal. First use get_pipeline_deals to find the ID.',
    input_schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Deal ID (get this from get_pipeline_deals first)'
        },
        name: { type: 'string', description: 'Updated deal name' },
        clientName: { type: 'string', description: 'Updated client name' },
        dealValue: { type: 'number', description: 'Updated deal value' },
        stage: {
          type: 'string',
          enum: ['lead', 'qualified', 'proposal', 'negotiation', 'committed', 'closed_won', 'closed_lost'],
          description: 'Updated stage'
        },
        probability: { type: 'number', description: 'Updated probability 0-100' },
        expectedCloseDate: { type: 'string', description: 'Updated expected close date' },
        notes: { type: 'string', description: 'Updated notes' }
      },
      required: ['id']
    }
  },
  {
    name: 'delete_pipeline_deal',
    description: 'Delete a pipeline deal. First use get_pipeline_deals to find the ID.',
    input_schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Deal ID to delete'
        }
      },
      required: ['id']
    }
  },

  // ============ READ TOOLS - Clients & Contracts ============
  {
    name: 'get_clients',
    description: 'Get list of clients with their contracts and lifetime value. Use this to answer questions about historical sales, client relationships, or to find a client ID before making updates.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'churned', 'prospect'],
          description: 'Optional filter by client status'
        },
        industry: {
          type: 'string',
          description: 'Optional filter by industry (Gaming, DeFi, L1/L2, NFT, Infrastructure, Enterprise)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_client_summary',
    description: 'Get summary metrics about clients and contracts including total lifetime revenue, average contract value, contract length stats, and revenue by industry.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  // ============ WRITE TOOLS - Client Management ============
  {
    name: 'add_client',
    description: 'Add a new client to track. Use this when the user wants to add a company as a client.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Client/company name'
        },
        industry: {
          type: 'string',
          enum: ['Gaming', 'DeFi', 'L1/L2', 'NFT', 'Infrastructure', 'Enterprise', 'Social', 'Other'],
          description: 'Client industry'
        },
        contactName: {
          type: 'string',
          description: 'Primary contact name'
        },
        contactEmail: {
          type: 'string',
          description: 'Primary contact email'
        },
        status: {
          type: 'string',
          enum: ['active', 'prospect', 'churned'],
          description: 'Client status - defaults to active'
        },
        notes: {
          type: 'string',
          description: 'Notes about the client'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'update_client',
    description: 'Update an existing client. First use get_clients to find their ID.',
    input_schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Client ID (get from get_clients first)'
        },
        name: { type: 'string', description: 'Updated client name' },
        industry: { type: 'string', description: 'Updated industry' },
        contactName: { type: 'string', description: 'Updated contact name' },
        contactEmail: { type: 'string', description: 'Updated contact email' },
        status: {
          type: 'string',
          enum: ['active', 'prospect', 'churned'],
          description: 'Updated status'
        },
        notes: { type: 'string', description: 'Updated notes' }
      },
      required: ['id']
    }
  },

  // ============ WRITE TOOLS - Contract Management ============
  {
    name: 'add_contract',
    description: 'Add a new contract to an existing client. First use get_clients to find the client ID.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: 'Client ID (get from get_clients first)'
        },
        name: {
          type: 'string',
          description: 'Contract name (e.g., "Advisory Retainer 2025")'
        },
        type: {
          type: 'string',
          enum: ['consulting', 'advisory', 'retainer', 'project'],
          description: 'Contract type - defaults to consulting'
        },
        totalValue: {
          type: 'number',
          description: 'Total contract value in USD'
        },
        monthlyValue: {
          type: 'number',
          description: 'Monthly payment amount (for recurring contracts)'
        },
        paymentFrequency: {
          type: 'string',
          enum: ['one-time', 'monthly', 'quarterly', 'annually'],
          description: 'How often payments are made - defaults to monthly'
        },
        startDate: {
          type: 'string',
          description: 'Contract start date in YYYY-MM-DD format'
        },
        endDate: {
          type: 'string',
          description: 'Contract end date in YYYY-MM-DD format (optional)'
        },
        contractLength: {
          type: 'number',
          description: 'Contract duration in months'
        },
        description: {
          type: 'string',
          description: 'Contract details or scope'
        },
        tags: {
          type: 'string',
          description: 'Comma-separated tags (e.g., "web3, gaming")'
        }
      },
      required: ['clientId', 'name', 'totalValue', 'startDate']
    }
  },
  {
    name: 'update_contract',
    description: 'Update an existing contract. First use get_clients to find the contract ID.',
    input_schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Contract ID'
        },
        name: { type: 'string', description: 'Updated contract name' },
        type: {
          type: 'string',
          enum: ['consulting', 'advisory', 'retainer', 'project'],
          description: 'Updated contract type'
        },
        status: {
          type: 'string',
          enum: ['active', 'completed', 'cancelled'],
          description: 'Updated contract status'
        },
        totalValue: { type: 'number', description: 'Updated total value' },
        monthlyValue: { type: 'number', description: 'Updated monthly value' },
        paymentsMade: { type: 'number', description: 'Number of payments received' },
        totalPaid: { type: 'number', description: 'Total amount paid to date' },
        endDate: { type: 'string', description: 'Updated end date' },
        description: { type: 'string', description: 'Updated description' },
        tags: { type: 'string', description: 'Updated tags' }
      },
      required: ['id']
    }
  },

  // ============ WRITE TOOLS - Projections ============
  {
    name: 'set_projection',
    description: 'Set a revenue or expense projection for a specific month. Use this when the user wants to update their forecast.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['revenue', 'expense'],
          description: 'Whether to set revenue or expense projection'
        },
        month: {
          type: 'string',
          description: 'Month in YYYY-MM-DD format (use first of month, e.g., 2026-02-01)'
        },
        amount: {
          type: 'number',
          description: 'Projected amount in USD'
        },
        notes: {
          type: 'string',
          description: 'Optional notes explaining the projection'
        }
      },
      required: ['type', 'month', 'amount']
    }
  }
];

// Convert to Anthropic tool format
export function getAnthropicTools() {
  return CFO_TOOLS.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema
  }));
}

// Convert to OpenAI function calling format
export function getOpenAITools() {
  return CFO_TOOLS.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema
    }
  }));
}
