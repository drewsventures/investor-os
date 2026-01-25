'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  Brain,
  ArrowRight,
} from 'lucide-react';

interface DashboardStats {
  organizations: {
    total: number;
    portfolio: number;
    prospects: number;
    lps: number;
  };
  people: {
    total: number;
    contactedLast30Days: number;
  };
  deals: {
    total: number;
    active: number;
    byStage: Record<string, number>;
  };
  investments: {
    totalDeployed: number;
    portfolioCount: number;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [orgsRes, peopleRes, dealsRes] = await Promise.all([
        fetch('/api/organizations'),
        fetch('/api/people'),
        fetch('/api/deals'),
      ]);

      const [orgsData, peopleData, dealsData] = await Promise.all([
        orgsRes.json(),
        peopleRes.json(),
        dealsRes.json(),
      ]);

      setStats({
        organizations: {
          total: orgsData.summary?.totalOrganizations || 0,
          portfolio: orgsData.summary?.portfolioCompanies || 0,
          prospects: orgsData.summary?.prospects || 0,
          lps: orgsData.summary?.lps || 0,
        },
        people: {
          total: peopleData.summary?.totalPeople || 0,
          contactedLast30Days: peopleData.summary?.contactedLast30Days || 0,
        },
        deals: {
          total: dealsData.summary?.totalDeals || 0,
          active: dealsData.summary?.activeDeals || 0,
          byStage: dealsData.summary?.dealsByStage || {},
        },
        investments: {
          totalDeployed: orgsData.summary?.totalInvested || 0,
          portfolioCount: orgsData.summary?.portfolioCompanies || 0,
        },
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Welcome back. Here&apos;s what&apos;s happening with your portfolio.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Portfolio Companies */}
        <Link href="/organizations?type=PORTFOLIO" className="group">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {stats?.organizations.portfolio || 0}
            </div>
            <div className="text-sm text-slate-600">Portfolio Companies</div>
          </div>
        </Link>

        {/* Total Deployed */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            ${((stats?.investments.totalDeployed || 0) / 1000000).toFixed(1)}M
          </div>
          <div className="text-sm text-slate-600">Total Deployed</div>
        </div>

        {/* Active Deals */}
        <Link href="/deals" className="group">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-orange-300 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-orange-600 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {stats?.deals.active || 0}
            </div>
            <div className="text-sm text-slate-600">Active Deals</div>
          </div>
        </Link>

        {/* People */}
        <Link href="/people" className="group">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-purple-300 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {stats?.people.total || 0}
            </div>
            <div className="text-sm text-slate-600">Contacts</div>
          </div>
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Deal Pipeline Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Deal Pipeline</h2>
            <Link
              href="/deals"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {[
              { stage: 'FIRST_CALL', label: 'First Call', color: 'bg-slate-400' },
              { stage: 'DILIGENCE', label: 'Diligence', color: 'bg-yellow-500' },
              { stage: 'TERM_SHEET', label: 'Term Sheet', color: 'bg-blue-500' },
              { stage: 'CLOSING', label: 'Closing', color: 'bg-purple-500' },
              { stage: 'PORTFOLIO', label: 'Portfolio', color: 'bg-green-500' },
            ].map((item) => (
              <div key={item.stage} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                <div className="flex-1 text-sm text-slate-700">{item.label}</div>
                <div className="text-sm font-semibold text-slate-900">
                  {stats?.deals.byStage?.[item.stage] || 0}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/brain"
              className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              <Brain className="w-6 h-6" />
              <div>
                <div className="font-semibold">AI Brain</div>
                <div className="text-xs text-blue-100">Ask anything</div>
              </div>
            </Link>
            <Link
              href="/organizations"
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all"
            >
              <Building2 className="w-6 h-6 text-slate-600" />
              <div>
                <div className="font-semibold text-slate-900">Add Company</div>
                <div className="text-xs text-slate-500">New organization</div>
              </div>
            </Link>
            <Link
              href="/people"
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all"
            >
              <Users className="w-6 h-6 text-slate-600" />
              <div>
                <div className="font-semibold text-slate-900">Add Contact</div>
                <div className="text-xs text-slate-500">New person</div>
              </div>
            </Link>
            <Link
              href="/deals"
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all"
            >
              <TrendingUp className="w-6 h-6 text-slate-600" />
              <div>
                <div className="font-semibold text-slate-900">New Deal</div>
                <div className="text-xs text-slate-500">Track opportunity</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Organization Breakdown */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Organization Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Link href="/organizations?type=PORTFOLIO" className="text-center p-4 rounded-lg hover:bg-slate-50 transition-all">
            <div className="text-2xl font-bold text-blue-600">{stats?.organizations.portfolio || 0}</div>
            <div className="text-sm text-slate-600">Portfolio</div>
          </Link>
          <Link href="/organizations?type=PROSPECT" className="text-center p-4 rounded-lg hover:bg-slate-50 transition-all">
            <div className="text-2xl font-bold text-orange-600">{stats?.organizations.prospects || 0}</div>
            <div className="text-sm text-slate-600">Prospects</div>
          </Link>
          <Link href="/organizations?type=LP" className="text-center p-4 rounded-lg hover:bg-slate-50 transition-all">
            <div className="text-2xl font-bold text-green-600">{stats?.organizations.lps || 0}</div>
            <div className="text-sm text-slate-600">LPs</div>
          </Link>
          <div className="text-center p-4 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">{stats?.organizations.total || 0}</div>
            <div className="text-sm text-slate-600">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
}
