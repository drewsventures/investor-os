'use client';

import { useState } from 'react';
import { TrendingUp, Plus, DollarSign, Calendar, Building2 } from 'lucide-react';

// Sales pipeline stages
const SALES_STAGES = [
  { id: 'lead', label: 'Lead', color: 'bg-gray-100 border-gray-300' },
  { id: 'qualified', label: 'Qualified', color: 'bg-blue-50 border-blue-300' },
  { id: 'proposal', label: 'Proposal', color: 'bg-purple-50 border-purple-300' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-50 border-orange-300' },
  { id: 'closed_won', label: 'Closed Won', color: 'bg-green-50 border-green-300' },
  { id: 'closed_lost', label: 'Closed Lost', color: 'bg-red-50 border-red-300' },
] as const;

interface SalesOpportunity {
  id: string;
  name: string;
  organization?: {
    id: string;
    name: string;
  };
  value: number;
  stage: string;
  expectedCloseDate?: string;
  probability: number;
}

export default function SalesPipelinePage() {
  const [opportunities] = useState<SalesOpportunity[]>([]);

  const getOpportunitiesByStage = (stage: string) => {
    return opportunities.filter((o) => o.stage === stage);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="p-6 h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="text-gray-500 text-sm mt-0.5">Denarii Labs sales opportunities</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Add Opportunity
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Total Pipeline</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(opportunities.reduce((sum, o) => sum + o.value, 0))}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Active Deals</div>
          <div className="text-2xl font-bold text-blue-600">
            {opportunities.filter((o) => !['closed_won', 'closed_lost'].includes(o.stage)).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Won This Month</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(
              opportunities
                .filter((o) => o.stage === 'closed_won')
                .reduce((sum, o) => sum + o.value, 0)
            )}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Avg Deal Size</div>
          <div className="text-2xl font-bold text-gray-900">
            {opportunities.length > 0
              ? formatCurrency(
                  opportunities.reduce((sum, o) => sum + o.value, 0) / opportunities.length
                )
              : '$0'}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-max pb-4">
          {SALES_STAGES.map((stage) => {
            const stageOpportunities = getOpportunitiesByStage(stage.id);

            return (
              <div
                key={stage.id}
                className={`w-72 flex-shrink-0 ${stage.color} border-2 rounded-xl flex flex-col`}
              >
                {/* Stage Header */}
                <div className="p-3 border-b border-gray-200 bg-white/50 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 text-sm">{stage.label}</h3>
                    <span className="text-xs bg-white px-2 py-0.5 rounded-full text-gray-600">
                      {stageOpportunities.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {stageOpportunities.map((opp) => (
                    <div
                      key={opp.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3"
                    >
                      <div className="font-medium text-gray-900 text-sm">{opp.name}</div>
                      {opp.organization && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {opp.organization.name}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          <DollarSign className="w-3 h-3" />
                          {formatCurrency(opp.value)}
                        </span>
                        {opp.expectedCloseDate && (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            <Calendar className="w-3 h-3" />
                            {new Date(opp.expectedCloseDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {stageOpportunities.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">No opportunities</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
