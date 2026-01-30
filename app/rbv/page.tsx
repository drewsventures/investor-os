'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Briefcase,
  ArrowRight,
  PiggyBank,
} from 'lucide-react';

interface DashboardStats {
  portfolioCompanies: number;
  totalInvested: number;
  portfolioValue: number;
  tvpi: number;
  activeDeals: number;
  lpProspects: number;
  syndicateDeals: number;
  coInvestors: number;
}

export default function RBVDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    portfolioCompanies: 0,
    totalInvested: 0,
    portfolioValue: 0,
    tvpi: 0,
    activeDeals: 0,
    lpProspects: 0,
    syndicateDeals: 0,
    coInvestors: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch Fund I data for portfolio stats
      const fundRes = await fetch('/api/fund');
      const fundData = await fundRes.json();

      // Fetch deals data
      const dealsRes = await fetch('/api/deals');
      const dealsData = await dealsRes.json();

      // Fetch syndicate data
      const syndicateRes = await fetch('/api/syndicate');
      const syndicateData = await syndicateRes.json();

      // Fetch LP prospects count
      const lpRes = await fetch('/api/lp-prospects?countsOnly=true');
      const lpData = await lpRes.json();

      setStats({
        portfolioCompanies: fundData.summary?.totalInvestments || 0,
        totalInvested: fundData.summary?.totalInvested || 0,
        portfolioValue: fundData.summary?.totalValue || 0,
        tvpi: fundData.summary?.tvpi || 0,
        activeDeals: dealsData.summary?.activeDeals || 0,
        lpProspects: lpData.total || 0,
        syndicateDeals: syndicateData.summary?.totalDeals || 0,
        coInvestors: 0, // To be implemented
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const quickLinks = [
    {
      title: 'Fund I Portfolio',
      description: 'View portfolio companies and performance',
      href: '/rbv/fund-i/portfolio',
      icon: Building2,
      color: 'bg-purple-500',
    },
    {
      title: 'Fund II Fundraise',
      description: 'LP pipeline and prospects',
      href: '/rbv/fund-ii',
      icon: Target,
      color: 'bg-green-500',
    },
    {
      title: 'Deal Pipeline',
      description: 'Active investment opportunities',
      href: '/rbv/deals',
      icon: TrendingUp,
      color: 'bg-blue-500',
    },
    {
      title: 'Syndicates',
      description: 'AngelList syndicate deals',
      href: '/rbv/syndicates',
      icon: Briefcase,
      color: 'bg-orange-500',
    },
  ];

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>
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
        <h1 className="text-3xl font-bold text-gray-900">RBV Dashboard</h1>
        <p className="text-gray-500 mt-1">Red Beard Ventures Overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Portfolio Companies</div>
              <div className="text-2xl font-bold text-gray-900">{stats.portfolioCompanies}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Portfolio Value</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.portfolioValue)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Active Deals</div>
              <div className="text-2xl font-bold text-gray-900">{stats.activeDeals}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">LP Prospects</div>
              <div className="text-2xl font-bold text-gray-900">{stats.lpProspects}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Fund Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-6 rounded-xl text-white">
          <div className="text-purple-200 text-sm">Total Invested</div>
          <div className="text-3xl font-bold mt-1">{formatCurrency(stats.totalInvested)}</div>
          <div className="text-purple-200 text-sm mt-2">Fund I Capital Deployed</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-700 p-6 rounded-xl text-white">
          <div className="text-green-200 text-sm">TVPI</div>
          <div className="text-3xl font-bold mt-1">{stats.tvpi.toFixed(2)}x</div>
          <div className="text-green-200 text-sm mt-2">Total Value to Paid In</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-6 rounded-xl text-white">
          <div className="text-blue-200 text-sm">Syndicate Deals</div>
          <div className="text-3xl font-bold mt-1">{stats.syndicateDeals}</div>
          <div className="text-blue-200 text-sm mt-2">AngelList Portfolio</div>
        </div>
      </div>

      {/* Quick Links */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Access</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all"
            >
              <div className={`${link.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                {link.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{link.description}</p>
              <div className="flex items-center gap-1 text-purple-600 text-sm mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>View</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
