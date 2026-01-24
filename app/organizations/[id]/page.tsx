'use client';

/**
 * Organization Detail Page
 * Comprehensive view of a single organization with all related data
 */

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  Briefcase,
  MessageSquare,
  CheckSquare,
  TrendingUp,
  Globe,
  ExternalLink,
  Plus,
  ArrowLeft,
  Calendar,
  DollarSign,
  Sparkles,
  GitBranch,
  Clock,
  ChevronRight
} from 'lucide-react';
import { InvestmentSummaryCard } from '@/components/investor-os/InvestmentSummaryCard';
import { HealthStatusCard } from '@/components/investor-os/HealthStatusCard';
import { LastUpdateCard } from '@/components/investor-os/LastUpdateCard';
import { MetricsDashboard } from '@/components/investor-os/MetricsDashboard';
import { CollapsibleAISidebar } from '@/components/investor-os/CollapsibleAISidebar';

interface Person {
  id: string;
  fullName: string;
  email: string | null;
  role: string;
  startDate: Date | null;
  relationshipId: string;
}

interface Deal {
  id: string;
  name: string;
  stage: string;
  dealType: string;
  askAmount: number | null;
  stageHistory?: StageHistoryItem[];
}

interface Investment {
  id: string;
  investmentDate: Date;
  investmentAmount: number;
  ownership: number | null;
  currentValuation: number | null;
  status: string;
}

interface Conversation {
  id: string;
  conversationDate: Date;
  medium: string;
  title: string;
  summary: string | null;
  participants: Array<{ fullName: string }>;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  assignedTo: { fullName: string } | null;
}

interface Fact {
  id: string;
  key: string;
  value: string;
  sourceType: string;
  confidence: number;
  validFrom: Date;
}

interface SyndicateDeal {
  id: string;
  companyName: string;
  status: string;
  investDate: Date | null;
  invested: number;
  unrealizedValue: number | null;
  realizedValue: number | null;
  multiple: number | null;
  fundName: string | null;
  round: string | null;
  instrument: string | null;
  valuation: number | null;
  numberOfLPs: number | null;
  isHostedDeal: boolean;
}

interface StageHistoryItem {
  fromStage: string | null;
  toStage: string;
  transitionDate: Date;
  daysInPreviousStage: number | null;
  notes: string | null;
}

interface DealPipelineSummary {
  dealId: string;
  currentStage: string;
  dealType: string;
  sourceChannel: string | null;
  referralSource: string | null;
  daysInCurrentStage: number;
  totalDaysInPipeline: number;
  stagesReached: string[];
  stageHistory: StageHistoryItem[];
  askAmount: number | null;
  expectedCloseDate: Date | null;
  passReason: string | null;
}

interface Organization {
  id: string;
  name: string;
  legalName: string | null;
  domain: string | null;
  website: string | null;
  organizationType: string;
  industry: string | null;
  stage: string | null;
  description: string | null;
  logoUrl: string | null;
  people: Person[];
  deals: Deal[];
  investments: Investment[];
  syndicateDeals: SyndicateDeal[];
  conversations: Conversation[];
  tasks: Task[];
  factsByType: Record<string, Fact[]>;
  metricsByType: Record<string, Array<{ date: Date; value: number; unit: string }>>;
  relationships: any[];
  dealPipelineSummary: DealPipelineSummary | null;
}

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'people' | 'deals' | 'conversations' | 'tasks' | 'facts'>('overview');
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    fetchOrganization();
  }, [id]);

  const fetchOrganization = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/organizations/${id}`);
      const data = await response.json();
      setOrganization(data);
    } catch (error) {
      console.error('Failed to fetch organization:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mt-20"></div>
          <p className="text-center mt-4 text-gray-600">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Organization not found</h3>
            <Link href="/organizations" className="text-blue-600 hover:underline">
              Back to organizations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/organizations"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Organizations
          </Link>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {organization.logoUrl ? (
                  <img src={organization.logoUrl} alt={organization.name} className="w-16 h-16 rounded-lg" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-blue-600" />
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
                  {organization.legalName && organization.legalName !== organization.name && (
                    <p className="text-sm text-gray-500 mt-1">{organization.legalName}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      organization.organizationType === 'PORTFOLIO' ? 'bg-blue-100 text-blue-800' :
                      organization.organizationType === 'PROSPECT' ? 'bg-orange-100 text-orange-800' :
                      organization.organizationType === 'LP' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {organization.organizationType}
                    </span>
                    {organization.industry && (
                      <span className="text-sm text-gray-500">{organization.industry}</span>
                    )}
                    {organization.stage && (
                      <span className="text-sm text-gray-500">• {organization.stage}</span>
                    )}
                  </div>
                  {organization.website && (
                    <a
                      href={organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                    >
                      <Globe className="w-4 h-4" />
                      {organization.domain}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  isChatOpen
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                {isChatOpen ? 'Close AI Brain' : 'Ask AI Brain'}
              </button>
            </div>

            {organization.description && (
              <p className="mt-4 text-gray-700">{organization.description}</p>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div>
                <div className="text-sm text-gray-600">People</div>
                <div className="text-2xl font-bold text-gray-900">{organization.people.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Deals</div>
                <div className="text-2xl font-bold text-gray-900">{organization.deals.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Conversations</div>
                <div className="text-2xl font-bold text-gray-900">{organization.conversations.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Open Tasks</div>
                <div className="text-2xl font-bold text-gray-900">{organization.tasks.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Deal Pipeline Status Card */}
        {organization.dealPipelineSummary && (
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Deal Pipeline Status</h3>
              </div>

              {/* Current Stage & Key Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-700">Current Stage</div>
                  <div className="text-xl font-bold text-blue-900">
                    {organization.dealPipelineSummary.currentStage.replace('_', ' ')}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Days in Stage
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {organization.dealPipelineSummary.daysInCurrentStage}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Total Pipeline Time</div>
                  <div className="text-xl font-bold text-gray-900">
                    {organization.dealPipelineSummary.totalDaysInPipeline} days
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Stages Progressed</div>
                  <div className="text-xl font-bold text-gray-900">
                    {organization.dealPipelineSummary.stageHistory.length}
                  </div>
                </div>
              </div>

              {/* Source Info */}
              {(organization.dealPipelineSummary.sourceChannel || organization.dealPipelineSummary.referralSource) && (
                <div className="flex gap-4 mb-4 text-sm">
                  {organization.dealPipelineSummary.sourceChannel && (
                    <div>
                      <span className="text-gray-500">Source:</span>{' '}
                      <span className="font-medium text-gray-900">{organization.dealPipelineSummary.sourceChannel}</span>
                    </div>
                  )}
                  {organization.dealPipelineSummary.referralSource && (
                    <div>
                      <span className="text-gray-500">Referred by:</span>{' '}
                      <span className="font-medium text-gray-900">{organization.dealPipelineSummary.referralSource}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Stage Progression Timeline */}
              {organization.dealPipelineSummary.stageHistory.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="text-sm font-medium text-gray-700 mb-3">Stage Progression</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {organization.dealPipelineSummary.stageHistory.map((history, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {idx > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                          history.toStage === organization.dealPipelineSummary!.currentStage
                            ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-400'
                            : history.toStage === 'PASSED'
                              ? 'bg-red-100 text-red-800'
                              : history.toStage === 'PORTFOLIO'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-700'
                        }`}>
                          {history.toStage.replace('_', ' ')}
                          {history.daysInPreviousStage !== null && (
                            <span className="text-xs opacity-70 ml-1">
                              ({history.daysInPreviousStage}d)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pass Reason if available */}
              {organization.dealPipelineSummary.passReason && organization.dealPipelineSummary.currentStage === 'PASSED' && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium text-red-600">Pass Reason:</span> {organization.dealPipelineSummary.passReason}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Investment Summary & Status Cards */}
        {organization.investments.length > 0 && (
          <div className="mb-6 space-y-4">
            {/* Investment Summary */}
            <InvestmentSummaryCard investments={organization.investments} />

            {/* Health & Last Update Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HealthStatusCard
                metricsByType={organization.metricsByType}
                tasks={organization.tasks}
                investments={organization.investments}
              />
              <LastUpdateCard
                conversations={organization.conversations}
                facts={Object.values(organization.factsByType).flat()}
              />
            </div>
          </div>
        )}

        {/* Metrics Dashboard */}
        {organization.organizationType === 'PORTFOLIO' && Object.keys(organization.metricsByType).length > 0 && (
          <div className="mb-6">
            <MetricsDashboard metricsByType={organization.metricsByType} />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'overview', label: 'Overview', icon: Building2 },
                { id: 'people', label: 'People', icon: Users, count: organization.people.length },
                { id: 'deals', label: 'Deals', icon: Briefcase, count: organization.deals.length },
                { id: 'conversations', label: 'Conversations', icon: MessageSquare, count: organization.conversations.length },
                { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: organization.tasks.length },
                { id: 'facts', label: 'Facts', icon: TrendingUp, count: Object.keys(organization.factsByType).length }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Investments */}
                {organization.investments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Investments</h3>
                    <div className="space-y-3">
                      {organization.investments.map((inv) => (
                        <div key={inv.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-gray-600">
                                {new Date(inv.investmentDate).toLocaleDateString()}
                              </div>
                              <div className="font-semibold text-gray-900">
                                ${(inv.investmentAmount / 1000000).toFixed(2)}M
                                {inv.ownership && ` • ${inv.ownership}% ownership`}
                              </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              inv.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                              inv.status === 'EXITED' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {inv.status}
                            </span>
                          </div>
                          {inv.currentValuation && (
                            <div className="text-sm text-gray-600 mt-2">
                              Current valuation: ${(inv.currentValuation / 1000000).toFixed(2)}M
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Syndicate Investments */}
                {organization.syndicateDeals && organization.syndicateDeals.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Syndicate Investments
                    </h3>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-sm text-blue-700">Total Invested</div>
                        <div className="text-xl font-bold text-blue-900">
                          ${(organization.syndicateDeals.reduce((sum, d) => sum + Number(d.invested), 0) / 1000000).toFixed(2)}M
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-sm text-green-700">Unrealized Value</div>
                        <div className="text-xl font-bold text-green-900">
                          ${(organization.syndicateDeals.reduce((sum, d) => sum + Number(d.unrealizedValue || 0), 0) / 1000000).toFixed(2)}M
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="text-sm text-purple-700">Realized Value</div>
                        <div className="text-xl font-bold text-purple-900">
                          ${(organization.syndicateDeals.reduce((sum, d) => sum + Number(d.realizedValue || 0), 0) / 1000000).toFixed(2)}M
                        </div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="text-sm text-orange-700"># of Rounds</div>
                        <div className="text-xl font-bold text-orange-900">
                          {organization.syndicateDeals.length}
                        </div>
                      </div>
                    </div>
                    {/* Individual Investments */}
                    <div className="space-y-3">
                      {organization.syndicateDeals.map((deal) => (
                        <div key={deal.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                deal.isHostedDeal ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {deal.isHostedDeal ? 'Hosted' : 'Co-Syndicate'}
                              </span>
                              {deal.round && (
                                <span className="text-sm text-gray-600">{deal.round}</span>
                              )}
                              {deal.instrument && (
                                <span className="text-xs text-gray-500">• {deal.instrument}</span>
                              )}
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              deal.status === 'LIVE' ? 'bg-green-100 text-green-800' :
                              deal.status === 'REALIZED' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {deal.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500">Invested</div>
                              <div className="font-semibold text-gray-900">
                                ${Number(deal.invested).toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">Unrealized</div>
                              <div className="font-semibold text-green-700">
                                ${Number(deal.unrealizedValue || 0).toLocaleString()}
                              </div>
                            </div>
                            {deal.valuation && (
                              <div>
                                <div className="text-gray-500">Valuation</div>
                                <div className="font-semibold text-gray-900">
                                  ${(Number(deal.valuation) / 1000000).toFixed(1)}M
                                </div>
                              </div>
                            )}
                            {deal.investDate && (
                              <div>
                                <div className="text-gray-500">Date</div>
                                <div className="font-semibold text-gray-900">
                                  {new Date(deal.investDate).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>
                          {deal.fundName && (
                            <div className="mt-2 text-xs text-gray-500">
                              Vehicle: {deal.fundName}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Metrics */}
                {Object.keys(organization.metricsByType).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Metrics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(organization.metricsByType).map(([type, metrics]) => {
                        const latest = metrics[0];
                        return (
                          <div key={type} className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-600">{type}</div>
                            <div className="text-2xl font-bold text-gray-900 mt-1">
                              {latest.unit === 'USD' ? `$${latest.value.toLocaleString()}` : latest.value}
                              {latest.unit && latest.unit !== 'USD' && ` ${latest.unit}`}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(latest.date).toLocaleDateString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Activity</h3>
                  <div className="space-y-3">
                    {organization.conversations.slice(0, 5).map((conv) => (
                      <div key={conv.id} className="flex items-start gap-3">
                        <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{conv.title}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(conv.conversationDate).toLocaleDateString()} •{' '}
                            {conv.participants.map(p => p.fullName).join(', ')}
                          </div>
                          {conv.summary && (
                            <div className="text-sm text-gray-500 mt-1">{conv.summary}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* People Tab */}
            {activeTab === 'people' && (
              <div>
                {organization.people.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600">No people associated yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {organization.people.map((person) => (
                      <Link
                        key={person.id}
                        href={`/people/${person.id}`}
                        className="block bg-gray-50 rounded-lg p-4 hover:bg-gray-100"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{person.fullName}</div>
                            <div className="text-sm text-gray-600">{person.role}</div>
                            {person.email && (
                              <div className="text-sm text-gray-500">{person.email}</div>
                            )}
                          </div>
                          {person.startDate && (
                            <div className="text-sm text-gray-500">
                              Since {new Date(person.startDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Deals Tab */}
            {activeTab === 'deals' && (
              <div>
                {organization.deals.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600">No deals yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {organization.deals.map((deal) => (
                      <Link
                        key={deal.id}
                        href={`/deals/${deal.id}`}
                        className="block bg-gray-50 rounded-lg p-4 hover:bg-gray-100"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{deal.name}</div>
                            <div className="text-sm text-gray-600">{deal.dealType}</div>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {deal.stage}
                            </span>
                            {deal.askAmount && (
                              <div className="text-sm text-gray-600 mt-1">
                                ${(deal.askAmount / 1000000).toFixed(2)}M
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conversations Tab */}
            {activeTab === 'conversations' && (
              <div>
                {organization.conversations.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600">No conversations logged yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {organization.conversations.map((conv) => (
                      <div key={conv.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{conv.title}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {new Date(conv.conversationDate).toLocaleDateString()} •{' '}
                              <span className="px-2 py-0.5 bg-white rounded text-xs">{conv.medium}</span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {conv.participants.map(p => p.fullName).join(', ')}
                            </div>
                            {conv.summary && (
                              <div className="text-sm text-gray-700 mt-2">{conv.summary}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div>
                {organization.tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600">No open tasks</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {organization.tasks.map((task) => (
                      <div key={task.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                task.priority === 'URGENT' ? 'bg-red-500' :
                                task.priority === 'HIGH' ? 'bg-orange-500' :
                                task.priority === 'MEDIUM' ? 'bg-yellow-500' :
                                'bg-gray-400'
                              }`}></span>
                              <div className="font-semibold text-gray-900">{task.title}</div>
                            </div>
                            {task.assignedTo && (
                              <div className="text-sm text-gray-600 mt-1">
                                Assigned to {task.assignedTo.fullName}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              task.status === 'TODO' ? 'bg-gray-100 text-gray-800' :
                              task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                              task.status === 'BLOCKED' ? 'bg-red-100 text-red-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </span>
                            {task.dueDate && (
                              <div className="text-xs text-gray-500 mt-1">
                                Due {new Date(task.dueDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Facts Tab */}
            {activeTab === 'facts' && (
              <div>
                {Object.keys(organization.factsByType).length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600">No facts recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(organization.factsByType).map(([type, facts]) => (
                      <div key={type}>
                        <h4 className="text-md font-semibold text-gray-900 mb-3 capitalize">
                          {type.replace(/_/g, ' ')}
                        </h4>
                        <div className="space-y-2">
                          {facts.map((fact) => (
                            <div key={fact.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-700">{fact.key}</div>
                                  <div className="text-sm text-gray-900 mt-1">{fact.value}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {fact.sourceType} • Confidence: {(fact.confidence * 100).toFixed(0)}% •{' '}
                                    {new Date(fact.validFrom).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Chat Sidebar */}
      <CollapsibleAISidebar
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
        organizationId={organization.id}
        organizationName={organization.name}
      />
    </div>
  );
}
