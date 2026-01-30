'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  Rocket,
  Handshake,
  ArrowRight,
  Store,
} from 'lucide-react';

interface DashboardStats {
  totalClients: number;
  activeProjects: number;
  pipelineValue: number;
  acceleratorPrograms: number;
  partnerVendors: number;
}

export default function DenariiDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeProjects: 0,
    pipelineValue: 0,
    acceleratorPrograms: 0,
    partnerVendors: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Implement Denarii-specific API
    setLoading(false);
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const quickLinks = [
    {
      title: 'Clients',
      description: 'Active client organizations',
      href: '/denarii/clients',
      icon: Building2,
      color: 'bg-blue-500',
    },
    {
      title: 'Sales Pipeline',
      description: 'Prospects and opportunities',
      href: '/denarii/sales',
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: 'Partner Vendors',
      description: 'Service partners and vendors',
      href: '/denarii/vendors',
      icon: Handshake,
      color: 'bg-purple-500',
    },
    {
      title: 'Accelerators',
      description: 'Programs and cohort companies',
      href: '/denarii/accelerators',
      icon: Rocket,
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
        <h1 className="text-3xl font-bold text-gray-900">Denarii Dashboard</h1>
        <p className="text-gray-500 mt-1">Denarii Labs Advisory Services</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Active Clients</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalClients}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Pipeline Value</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.pipelineValue)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Handshake className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Partner Vendors</div>
              <div className="text-2xl font-bold text-gray-900">{stats.partnerVendors}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Rocket className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Accelerator Programs</div>
              <div className="text-2xl font-bold text-gray-900">{stats.acceleratorPrograms}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl text-white mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Store className="w-6 h-6" />
          <h2 className="text-xl font-bold">Denarii Labs Hub</h2>
        </div>
        <p className="text-slate-300">
          This hub will centralize all Denarii Labs advisory operations including client management,
          sales pipeline, partner relationships, and accelerator programs.
        </p>
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
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {link.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{link.description}</p>
              <div className="flex items-center gap-1 text-blue-600 text-sm mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
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
