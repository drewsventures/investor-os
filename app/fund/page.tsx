'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface FundInvestment {
  id: string;
  companyName: string;
  nickname: string | null;
  investmentType: string;
  status: string;
  sector: string | null;
  amountInvested: string | number;
  tokenName: string | null;
  tokenQuantity: string | number | null;
  currentPrice: string | number | null;
  tokenValue: string | number | null;
  equityValue: string | number | null;
  totalValue: string | number | null;
  isLiquid: boolean;
  liquidBalance: string | number | null;
  realizedValue: string | number | null;
  realizedPercent: string | number | null;
  vestingEndDate: string | null;
  organization: {
    id: string;
    name: string;
    website: string | null;
    description: string | null;
  } | null;
  tokenSales: Array<{
    saleDate: string;
    tokensSold: string | number;
    totalProceeds: string | number;
  }>;
}

interface Summary {
  totalInvestments: number;
  totalInvested: number;
  totalTokenValue: number;
  totalEquityValue: number;
  totalValue: number;
  totalRealized: number;
  liquidBalance: number;
  nonLiquidBalance: number;
  liquidPercent: number;
  tokenPositions: number;
  equityPositions: number;
  liquidPositions: number;
  tvpi: number;
  dpi: number;
  rvpi: number;
  sectors: Array<{ name: string; count: number }>;
}

export default function FundPage() {
  const [investments, setInvestments] = useState<FundInvestment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [liquidFilter, setLiquidFilter] = useState('');

  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/fund');
      const data = await res.json();
      setInvestments(data.investments || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Failed to fetch investments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | string | null, decimals = 2) => {
    if (value === null || value === undefined) return '—';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '—';
    if (num >= 1000000) return `$${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  const formatNumber = (value: number | string | null, decimals = 0) => {
    if (value === null || value === undefined) return '—';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '—';
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(decimals);
  };

  const formatMultiple = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return `${value.toFixed(2)}x`;
  };

  const formatPercent = (value: number | string | null) => {
    if (value === null || value === undefined) return '—';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '—';
    return `${num.toFixed(1)}%`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'TOKEN_SAFT': return 'bg-purple-100 text-purple-800';
      case 'EQUITY': return 'bg-blue-100 text-blue-800';
      case 'TPA': return 'bg-orange-100 text-orange-800';
      case 'WARRANT': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'PARTIALLY_REALIZED': return 'bg-yellow-100 text-yellow-800';
      case 'FULLY_REALIZED': return 'bg-blue-100 text-blue-800';
      case 'WRITTEN_OFF': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter investments
  const filteredInvestments = investments.filter((inv) => {
    const matchesSearch = !searchQuery ||
      inv.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.tokenName && inv.tokenName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = !typeFilter || inv.investmentType === typeFilter;
    const matchesSector = !sectorFilter || inv.sector === sectorFilter;
    const matchesLiquid = !liquidFilter ||
      (liquidFilter === 'liquid' && inv.isLiquid) ||
      (liquidFilter === 'locked' && !inv.isLiquid);
    return matchesSearch && matchesType && matchesSector && matchesLiquid;
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">RBV Fund I Portfolio</h1>
        <p className="text-gray-500 mt-1">Red Beard Ventures Fund I LP</p>
      </div>

      {/* Key Metrics */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500">Total Invested</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary.totalInvested)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500">Portfolio Value</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalValue)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500">TVPI</div>
            <div className="text-2xl font-bold text-purple-600">
              {formatMultiple(summary.tvpi)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500">DPI</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatMultiple(summary.dpi)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500">Total Realized</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary.totalRealized)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500">Positions</div>
            <div className="text-2xl font-bold text-gray-900">
              {summary.totalInvestments}
            </div>
          </div>
        </div>
      )}

      {/* Additional Stats Row */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
            <div className="text-sm text-purple-700">Token Value</div>
            <div className="text-xl font-bold text-purple-900">
              {formatCurrency(summary.totalTokenValue)}
            </div>
            <div className="text-xs text-purple-600 mt-1">
              {summary.tokenPositions} positions
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
            <div className="text-sm text-blue-700">Equity Value</div>
            <div className="text-xl font-bold text-blue-900">
              {formatCurrency(summary.totalEquityValue)}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {summary.equityPositions} positions
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
            <div className="text-sm text-green-700">Liquid Balance</div>
            <div className="text-xl font-bold text-green-900">
              {formatCurrency(summary.liquidBalance)}
            </div>
            <div className="text-xs text-green-600 mt-1">
              {formatPercent(summary.liquidPercent)} of portfolio
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
            <div className="text-sm text-orange-700">Non-Liquid</div>
            <div className="text-xl font-bold text-orange-900">
              {formatCurrency(summary.nonLiquidBalance)}
            </div>
            <div className="text-xs text-orange-600 mt-1">
              Locked/Vesting
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl">
            <div className="text-sm text-gray-700">RVPI</div>
            <div className="text-xl font-bold text-gray-900">
              {formatMultiple(summary.rvpi)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Residual Value
            </div>
          </div>
        </div>
      )}

      {/* Sector Distribution */}
      {summary && summary.sectors.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Portfolio by Sector</h3>
          <div className="flex flex-wrap gap-2">
            {summary.sectors.map((sector) => (
              <button
                key={sector.name}
                onClick={() => setSectorFilter(sectorFilter === sector.name ? '' : sector.name)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  sectorFilter === sector.name
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {sector.name} ({sector.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search company or token..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 w-64"
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Types</option>
          <option value="TOKEN_SAFT">Token/SAFT</option>
          <option value="EQUITY">Equity</option>
          <option value="TPA">TPA</option>
          <option value="WARRANT">Warrant</option>
        </select>

        <select
          value={liquidFilter}
          onChange={(e) => setLiquidFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Liquidity</option>
          <option value="liquid">Liquid</option>
          <option value="locked">Locked/Vesting</option>
        </select>

        {(searchQuery || typeFilter || sectorFilter || liquidFilter) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('');
              setSectorFilter('');
              setLiquidFilter('');
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto text-sm text-gray-500">
          Showing {filteredInvestments.length} of {investments.length} positions
        </div>
      </div>

      {/* Investments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sector
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invested
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Token
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Liquid
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvestments.map((inv) => {
                const moic = Number(inv.amountInvested) > 0
                  ? (Number(inv.totalValue) || 0) / Number(inv.amountInvested)
                  : 0;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {inv.organization ? (
                              <Link
                                href={`/organizations/${inv.organization.id}`}
                                className="hover:text-purple-600"
                              >
                                {inv.companyName}
                              </Link>
                            ) : (
                              inv.companyName
                            )}
                          </div>
                          {inv.nickname && (
                            <div className="text-xs text-gray-500">{inv.nickname}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(inv.investmentType)}`}>
                        {inv.investmentType.replace('_', '/')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {inv.sector || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(inv.amountInvested)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {inv.tokenName ? (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-mono">
                          {inv.tokenName}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatNumber(inv.tokenQuantity)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                      {inv.currentPrice
                        ? `$${Number(inv.currentPrice) < 0.01
                            ? Number(inv.currentPrice).toFixed(6)
                            : Number(inv.currentPrice).toFixed(4)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(inv.totalValue || inv.tokenValue || inv.equityValue)}
                      </div>
                      {moic > 0 && (
                        <div className={`text-xs ${moic >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                          {moic.toFixed(2)}x
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {inv.isLiquid ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                          Locked
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredInvestments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No investments found</p>
        </div>
      )}
    </div>
  );
}
