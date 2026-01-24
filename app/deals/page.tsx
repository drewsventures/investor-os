'use client';

/**
 * Deal Pipeline Kanban Board
 * Visualize and manage investment pipeline across stages
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Plus,
  DollarSign,
  Calendar,
} from 'lucide-react';

interface Deal {
  id: string;
  name: string;
  stage: string;
  dealType: string;
  askAmount: number | null;
  expectedCloseDate: Date | null;
  sourceChannel: string | null;
  referralSource: string | null;
  organization: {
    id: string;
    name: string;
    organizationType: string;
    industry: string | null;
  };
  tasks: Array<{ id: string }>;
  stageHistory: Array<{
    id: string;
    fromStage: string | null;
    toStage: string;
    transitionDate: string;
  }>;
  _count: {
    conversations: number;
    facts: number;
    stageHistory: number;
  };
  createdAt: Date;
}

interface DealSummary {
  dealsByStage: Record<string, number>;
  totalPotentialInvestment: number;
}

const STAGES = [
  { id: 'SOURCED', label: 'Sourced', color: 'bg-gray-100 border-gray-300' },
  { id: 'FIRST_CALL', label: 'First Call', color: 'bg-blue-50 border-blue-200' },
  { id: 'DILIGENCE', label: 'Diligence', color: 'bg-purple-50 border-purple-200' },
  { id: 'PARTNER_REVIEW', label: 'Partner Review', color: 'bg-indigo-50 border-indigo-200' },
  { id: 'TERM_SHEET', label: 'Term Sheet', color: 'bg-orange-50 border-orange-200' },
  { id: 'CLOSING', label: 'Closing', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'PORTFOLIO', label: 'Portfolio', color: 'bg-green-50 border-green-200' },
  { id: 'PASSED', label: 'Passed', color: 'bg-red-50 border-red-200' }
];

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [summary, setSummary] = useState<DealSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dealTypeFilter, setDealTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/deals');
      const data = await response.json();
      setDeals(data.deals || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('dealId', dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('dealId');

    try {
      const response = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      });

      if (response.ok) {
        fetchDeals(); // Refresh the board
      }
    } catch (error) {
      console.error('Failed to update deal stage:', error);
    }
  };

  // Filter deals
  const filteredDeals = deals.filter(deal => {
    if (dealTypeFilter && deal.dealType !== dealTypeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        deal.name.toLowerCase().includes(query) ||
        deal.organization.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Group by stage
  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = filteredDeals.filter(d => d.stage === stage.id);
    return acc;
  }, {} as Record<string, Deal[]>);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-blue-600" />
              Deal Pipeline
            </h1>
            <p className="text-gray-600 mt-1">
              Track investment opportunities from sourcing to portfolio
            </p>
          </div>
          <Link
            href="/deals/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Deal
          </Link>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Deals</div>
              <div className="text-2xl font-bold text-gray-900">{deals.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Active Pipeline</div>
              <div className="text-2xl font-bold text-blue-600">
                {Object.entries(summary.dealsByStage)
                  .filter(([stage]) => !['PORTFOLIO', 'PASSED'].includes(stage))
                  .reduce((sum, [_, count]) => sum + count, 0)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Portfolio</div>
              <div className="text-2xl font-bold text-green-600">
                {summary.dealsByStage['PORTFOLIO'] || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Potential</div>
              <div className="text-2xl font-bold text-gray-900">
                ${(summary.totalPotentialInvestment / 1000000).toFixed(1)}M
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[300px]">
              <input
                type="text"
                placeholder="Search deals or organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={dealTypeFilter}
              onChange={(e) => setDealTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Deal Types</option>
              <option value="SAFE">SAFE</option>
              <option value="PRICED_ROUND">Priced Round</option>
              <option value="CONVERTIBLE_NOTE">Convertible Note</option>
              <option value="TOKEN_SALE">Token Sale</option>
              <option value="ADVISOR">Advisor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pipeline...</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageDeals = dealsByStage[stage.id] || [];
            const stageTotalAsk = stageDeals.reduce((sum, d) => sum + (d.askAmount || 0), 0);

            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-80"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className={`rounded-lg border-2 ${stage.color} p-4`}>
                  {/* Stage Header */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{stage.label}</h3>
                      <span className="bg-white px-2 py-0.5 rounded-full text-xs font-medium text-gray-600">
                        {stageDeals.length}
                      </span>
                    </div>
                    {stageTotalAsk > 0 && (
                      <div className="text-xs text-gray-600">
                        ${(stageTotalAsk / 1000000).toFixed(1)}M total
                      </div>
                    )}
                  </div>

                  {/* Deal Cards */}
                  <div className="space-y-3">
                    {stageDeals.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        No deals in this stage
                      </div>
                    ) : (
                      stageDeals.map((deal) => (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal.id)}
                          className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md cursor-move border border-gray-200 transition-shadow"
                        >
                          <div>
                            <Link href={`/deals/${deal.id}`}>
                              <h4 className="font-semibold text-gray-900 hover:text-blue-600 mb-1">
                                {deal.name}
                              </h4>
                            </Link>
                            <Link href={`/organizations/${deal.organization.id}`} className="text-sm text-gray-600 hover:text-blue-600 mb-2 block">
                              {deal.organization.name}
                            </Link>

                              {deal.askAmount && (
                                <div className="flex items-center gap-1 text-sm text-gray-700 mb-2">
                                  <DollarSign className="w-4 h-4" />
                                  ${(deal.askAmount / 1000000).toFixed(2)}M
                                </div>
                              )}

                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded">
                                  {deal.dealType}
                                </span>
                                {deal.expectedCloseDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(deal.expectedCloseDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                )}
                              </div>

                              {(deal.tasks?.length > 0 || deal._count?.facts > 0 || deal._count?.stageHistory > 0) && (
                                <div className="flex gap-3 mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                                  {deal.tasks?.length > 0 && <span>✓ {deal.tasks.length} tasks</span>}
                                  {deal._count?.facts > 0 && <span>📊 {deal._count.facts} facts</span>}
                                  {deal._count?.stageHistory > 0 && <span>📈 {deal._count.stageHistory} moves</span>}
                                </div>
                              )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
