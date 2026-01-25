'use client';

/**
 * AngelList Syndicate Portfolio Page
 * Track all syndicate investments with filtering, stats, and news
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Search,
  Upload,
  TrendingUp,
  DollarSign,
  Users,
  Filter,
  ExternalLink,
  Newspaper,
  RefreshCw,
  Building,
} from 'lucide-react';

interface SyndicateDeal {
  id: string;
  companyName: string;
  companyDomain: string | null;
  market: string | null;
  status: 'LIVE' | 'REALIZED' | 'CLOSING' | 'TRANSFERRED';
  dealType: 'SYNDICATE' | 'FUND';
  isHostedDeal: boolean;
  investDate: string | null;
  invested: number;
  unrealizedValue: number | null;
  realizedValue: number | null;
  netValue: number | null;
  multiple: number | null;
  investmentEntity: string;
  leadSyndicate: string | null;
  fundName: string | null;
  round: string | null;
  instrument: string | null;
  allocation: number | null;
  valuation: number | null;
  carry: number | null;
  organizationId: string | null;
}

interface Summary {
  totalDeals: number;
  totalInvested: number;
  totalNetValue: number;
  overallMultiple: number;
  liveDeals: number;
  realizedDeals: number;
  hostedDeals: number;
  coSyndicateDeals: number;
  markets?: string[];
  leadSyndicates?: string[];
  leadSyndicateBreakdown?: Record<string, { count: number; invested: number }>;
}

export default function SyndicatePage() {
  const [deals, setDeals] = useState<SyndicateDeal[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [marketFilter, setMarketFilter] = useState('');
  const [leadSyndicateFilter, setLeadSyndicateFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateOrgsModal, setShowCreateOrgsModal] = useState(false);
  const [orgCreationPreview, setOrgCreationPreview] = useState<{
    summary: {
      totalDealsWithoutOrg: number;
      uniqueCompanies: number;
      wouldCreateOrgs: number;
      wouldLinkDeals: number;
      hostedCount: number;
      coSyndicateCount: number;
    };
    byLeadSyndicate: Record<string, { count: number; invested: number }>;
    preview: Array<{
      companyName: string;
      dealCount: number;
      hasExistingOrg: boolean;
      isHosted: boolean;
      leadSyndicate: string | null;
      market: string | null;
      invested: number;
    }>;
  } | null>(null);
  const [creatingOrgs, setCreatingOrgs] = useState(false);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter === 'hosted') params.append('isHosted', 'true');
      if (typeFilter === 'cosyndicate') params.append('isHosted', 'false');
      if (marketFilter) params.append('market', marketFilter);
      if (leadSyndicateFilter) params.append('leadSyndicate', leadSyndicateFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/syndicate?${params}`);
      const data = await response.json();
      setDeals(data.deals || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, marketFilter, leadSyndicateFilter, searchQuery]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const fetchOrgCreationPreview = async () => {
    try {
      const response = await fetch('/api/syndicate/create-orgs');
      const data = await response.json();
      setOrgCreationPreview(data);
    } catch (error) {
      console.error('Failed to fetch org creation preview:', error);
    }
  };

  const handleCreateOrgs = async () => {
    setCreatingOrgs(true);
    try {
      const response = await fetch('/api/syndicate/create-orgs', {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success) {
        alert(`Created ${result.results.created} organizations and linked ${result.results.linked} deals!`);
        setShowCreateOrgsModal(false);
        setOrgCreationPreview(null);
        fetchDeals();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create orgs:', error);
      alert('Failed to create organizations');
    } finally {
      setCreatingOrgs(false);
    }
  };

  const handleImport = async (csvText: string) => {
    setImporting(true);
    try {
      // Parse CSV
      const lines = csvText.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        // Handle CSV with quoted fields containing commas
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (const char of lines[i]) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));

        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        rows.push(row);
      }

      const response = await fetch('/api/syndicate/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Import complete!\n\nImported: ${result.imported}\nUpdated: ${result.updated}\nTotal: ${result.total}`);
        setShowImportModal(false);
        fetchDeals();
      } else {
        alert(`Import failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import CSV');
    } finally {
      setImporting(false);
    }
  };

  const formatCurrency = (value: number | string | null) => {
    if (value === null || value === undefined) return '—';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '—';
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  const formatMultiple = (value: number | string | null) => {
    if (value === null || value === undefined) return '—';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '—';
    return `${num.toFixed(2)}x`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE': return 'bg-green-100 text-green-800';
      case 'REALIZED': return 'bg-blue-100 text-blue-800';
      case 'CLOSING': return 'bg-yellow-100 text-yellow-800';
      case 'TRANSFERRED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-purple-600" />
              Syndicate Portfolio
            </h1>
            <p className="text-gray-600 mt-1">
              AngelList syndicate investments and fund positions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowCreateOrgsModal(true);
                fetchOrgCreationPreview();
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <Building className="w-4 h-4" />
              Create Orgs
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Deals</div>
              <div className="text-2xl font-bold text-gray-900">{summary.totalDeals}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Invested</div>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(summary.totalInvested)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Net Value</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalNetValue)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Multiple</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatMultiple(summary.overallMultiple)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Hosted (RBV)</div>
              <div className="text-2xl font-bold text-orange-600">{summary.hostedDeals}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Co-Syndicate</div>
              <div className="text-2xl font-bold text-gray-700">{summary.coSyndicateDeals}</div>
            </div>
          </div>
        )}

        {/* Lead Syndicate Partners Breakdown */}
        {summary?.leadSyndicateBreakdown && Object.keys(summary.leadSyndicateBreakdown).length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Co-Syndicate Partners</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.leadSyndicateBreakdown)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 8)
                .map(([lead, data]) => (
                  <button
                    key={lead}
                    onClick={() => {
                      setTypeFilter('cosyndicate');
                      setLeadSyndicateFilter(lead);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                      leadSyndicateFilter === lead
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{lead}</span>
                    <span className={`text-xs ${leadSyndicateFilter === lead ? 'text-purple-200' : 'text-gray-500'}`}>
                      {data.count} deals • {formatCurrency(data.invested)}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Status</option>
            <option value="LIVE">Live</option>
            <option value="REALIZED">Realized</option>
            <option value="CLOSING">Closing</option>
            <option value="TRANSFERRED">Transferred</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Types</option>
            <option value="hosted">Hosted (RBV Lead)</option>
            <option value="cosyndicate">Co-Syndicate</option>
          </select>

          {/* Market Filter */}
          {summary?.markets && summary.markets.length > 0 && (
            <select
              value={marketFilter}
              onChange={(e) => setMarketFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Markets</option>
              {summary.markets.map(market => (
                <option key={market} value={market}>{market}</option>
              ))}
            </select>
          )}

          {/* Lead Syndicate Filter (for co-syndicates) */}
          {summary?.leadSyndicates && summary.leadSyndicates.length > 0 && (
            <select
              value={leadSyndicateFilter}
              onChange={(e) => setLeadSyndicateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Lead Syndicates</option>
              {summary.leadSyndicates.map(lead => (
                <option key={lead} value={lead}>
                  {lead} ({summary.leadSyndicateBreakdown?.[lead]?.count || 0})
                </option>
              ))}
            </select>
          )}

          {/* Refresh */}
          <button
            onClick={() => fetchDeals()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Deals Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading deals...</p>
        </div>
      ) : deals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No deals found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || statusFilter || typeFilter || marketFilter
              ? 'Try adjusting your filters'
              : 'Import your AngelList CSV to get started'}
          </p>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invested
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Multiple
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Market
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Round
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Carry
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${deal.isHostedDeal ? 'bg-orange-500' : 'bg-gray-400'}`} />
                        <div>
                          {deal.organizationId ? (
                            <a
                              href={`/organizations/${deal.organizationId}`}
                              style={{ color: '#7c3aed', textDecoration: 'underline', cursor: 'pointer' }}
                              className="text-sm font-medium"
                            >
                              {deal.companyName}
                            </a>
                          ) : (
                            <span className="text-sm font-medium text-gray-900">
                              {deal.companyName}
                            </span>
                          )}
                          {deal.fundName && (
                            <div className="text-xs text-gray-500 truncate max-w-[200px]">
                              {deal.fundName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(deal.status)}`}>
                        {deal.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {deal.investDate
                        ? new Date(deal.investDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(deal.invested)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      <span className={deal.netValue && deal.netValue > deal.invested ? 'text-green-600 font-medium' : 'text-gray-900'}>
                        {formatCurrency(deal.netValue)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      <span className={deal.multiple && deal.multiple > 1 ? 'text-green-600 font-medium' : deal.multiple && deal.multiple < 1 ? 'text-red-600' : 'text-gray-900'}>
                        {formatMultiple(deal.multiple)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {deal.market || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {deal.round || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <span className={deal.isHostedDeal ? 'text-orange-600 font-medium' : ''}>
                        {deal.leadSyndicate || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                      {deal.carry !== null ? `${(Number(deal.carry) * 100).toFixed(0)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results count */}
      {!loading && deals.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {deals.length} deals
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Import AngelList CSV</h2>
            <p className="text-gray-600 mb-4">
              Paste your AngelList export CSV data below. The importer will automatically
              map columns and handle duplicates.
            </p>
            <textarea
              id="csv-input"
              className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Paste CSV content here..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                disabled={importing}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const textarea = document.getElementById('csv-input') as HTMLTextAreaElement;
                  if (textarea?.value) {
                    handleImport(textarea.value);
                  }
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                disabled={importing}
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Organizations Modal */}
      {showCreateOrgsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Organizations from Syndicate Deals</h2>
            <p className="text-gray-600 mb-4">
              This will create Organization records for syndicate companies that don&apos;t have one yet,
              allowing you to track them in your portfolio.
            </p>

            {orgCreationPreview ? (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Deals without Org</div>
                    <div className="text-xl font-bold text-gray-900">{orgCreationPreview.summary.totalDealsWithoutOrg}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Unique Companies</div>
                    <div className="text-xl font-bold text-gray-900">{orgCreationPreview.summary.uniqueCompanies}</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Hosted (RBV)</div>
                    <div className="text-xl font-bold text-orange-600">{orgCreationPreview.summary.hostedCount}</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Co-Syndicate</div>
                    <div className="text-xl font-bold text-blue-600">{orgCreationPreview.summary.coSyndicateCount}</div>
                  </div>
                </div>

                {/* Lead Syndicate Breakdown */}
                {Object.keys(orgCreationPreview.byLeadSyndicate).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">By Lead Syndicate Partner</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(orgCreationPreview.byLeadSyndicate)
                        .sort((a, b) => b[1].count - a[1].count)
                        .slice(0, 10)
                        .map(([lead, data]) => (
                          <span
                            key={lead}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                          >
                            {lead}: {data.count}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {/* Preview Table */}
                <div className="border rounded-lg overflow-hidden mb-4">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Deals</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {orgCreationPreview.preview.map((item, idx) => (
                          <tr key={idx} className="text-sm">
                            <td className="px-3 py-2">{item.companyName}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${item.isHosted ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                {item.isHosted ? 'Hosted' : 'Co-Syndicate'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-500">{item.leadSyndicate || '—'}</td>
                            <td className="px-3 py-2">{item.dealCount}</td>
                            <td className="px-3 py-2">
                              {item.hasExistingOrg ? (
                                <span className="text-green-600 text-xs">Has Org</span>
                              ) : (
                                <span className="text-blue-600 text-xs">Will Create</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 mb-4">
                  Will create <strong>{orgCreationPreview.summary.wouldCreateOrgs}</strong> new organizations
                  and link <strong>{orgCreationPreview.summary.wouldLinkDeals}</strong> deals.
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
                <p className="mt-2 text-gray-500">Loading preview...</p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowCreateOrgsModal(false);
                  setOrgCreationPreview(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                disabled={creatingOrgs}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrgs}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                disabled={creatingOrgs || !orgCreationPreview}
              >
                {creatingOrgs ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Building className="w-4 h-4" />
                    Create Organizations
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
