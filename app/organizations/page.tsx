'use client';

/**
 * Organizations List Page
 * View and manage all organizations (portfolio, prospects, LPs, service providers)
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  Plus,
  ExternalLink
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  organizationType: string;
  industry: string | null;
  stage: string | null;
  description: string | null;
  logoUrl: string | null;
  dealCount: number;
  investmentCount: number;
  conversationCount: number;
  lastContactedAt: Date | null;
  createdAt: Date;
}

interface OrganizationSummary {
  portfolioCount: number;
  prospectCount: number;
  lpCount: number;
  serviceProviderCount: number;
  totalInvested: number;
  industryBreakdown: Record<string, number>;
  stageBreakdown: Record<string, number>;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [summary, setSummary] = useState<OrganizationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [industryFilter, setIndustryFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'lastContact' | 'created'>('name');

  useEffect(() => {
    fetchOrganizations();
  }, [typeFilter, industryFilter]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append('organizationType', typeFilter);
      if (industryFilter) params.append('industry', industryFilter);

      const response = await fetch(`/api/organizations?${params}`);
      const data = await response.json();

      setOrganizations(data.organizations || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort
  const filteredOrgs = organizations
    .filter(org => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        org.name.toLowerCase().includes(query) ||
        org.domain?.toLowerCase().includes(query) ||
        org.industry?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'lastContact') {
        if (!a.lastContactedAt) return 1;
        if (!b.lastContactedAt) return -1;
        return new Date(b.lastContactedAt).getTime() - new Date(a.lastContactedAt).getTime();
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // Get unique industries for filter dropdown
  const industries = Array.from(new Set(organizations.map(o => o.industry).filter(Boolean)));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              Organizations
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your portfolio companies, prospects, LPs, and partners
            </p>
          </div>
          <Link
            href="/organizations/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Organization
          </Link>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Portfolio</div>
              <div className="text-2xl font-bold text-blue-600">{summary.portfolioCount}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Prospects</div>
              <div className="text-2xl font-bold text-orange-600">{summary.prospectCount}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">LPs</div>
              <div className="text-2xl font-bold text-green-600">{summary.lpCount}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Invested</div>
              <div className="text-2xl font-bold text-gray-900">
                ${(summary.totalInvested / 1000000).toFixed(1)}M
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="PORTFOLIO">Portfolio</option>
            <option value="PROSPECT">Prospect</option>
            <option value="LP">LP</option>
            <option value="SERVICE_PROVIDER">Service Provider</option>
          </select>

          {/* Industry Filter */}
          {industries.length > 0 && (
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Industries</option>
              {industries.map(industry => (
                <option key={industry} value={industry!}>{industry}</option>
              ))}
            </select>
          )}

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Name</option>
            <option value="lastContact">Last Contact</option>
            <option value="created">Recently Added</option>
          </select>
        </div>
      </div>

      {/* Organizations List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading organizations...</p>
        </div>
      ) : filteredOrgs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No organizations found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || typeFilter || industryFilter
              ? 'Try adjusting your filters'
              : 'Get started by adding your first organization'}
          </p>
          <Link
            href="/organizations/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Organization
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Industry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Contact
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrgs.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/organizations/${org.id}`} className="flex items-center gap-3">
                      {org.logoUrl ? (
                        <img src={org.logoUrl} alt={org.name} className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {org.name}
                        </div>
                        {org.website && (
                          <a
                            href={org.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {org.domain}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      org.organizationType === 'PORTFOLIO' ? 'bg-blue-100 text-blue-800' :
                      org.organizationType === 'PROSPECT' ? 'bg-orange-100 text-orange-800' :
                      org.organizationType === 'LP' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {org.organizationType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {org.industry || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {org.stage || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs text-gray-500">
                      {org.dealCount > 0 && <div>{org.dealCount} deals</div>}
                      {org.investmentCount > 0 && <div>{org.investmentCount} investments</div>}
                      {org.conversationCount > 0 && <div>{org.conversationCount} conversations</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {org.lastContactedAt
                      ? new Date(org.lastContactedAt).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Results count */}
      {!loading && filteredOrgs.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {filteredOrgs.length} of {organizations.length} organizations
        </div>
      )}
    </div>
  );
}
