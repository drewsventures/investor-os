'use client';

import React from 'react';
import { TrendingUp, DollarSign, Users, Flame, Clock } from 'lucide-react';

interface MetricData {
  date: Date;
  value: number;
  unit: string;
}

interface MetricsDashboardProps {
  metricsByType: Record<string, MetricData[]>;
}

const METRIC_CONFIG: Record<string, {
  icon: React.ElementType;
  label: string;
  format: (value: number, unit: string) => string;
  color: string;
}> = {
  MRR: {
    icon: DollarSign,
    label: 'MRR',
    format: (v) => `$${(v / 1000).toFixed(0)}K`,
    color: 'text-green-600'
  },
  ARR: {
    icon: TrendingUp,
    label: 'ARR',
    format: (v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`,
    color: 'text-green-600'
  },
  BURN_RATE: {
    icon: Flame,
    label: 'Burn Rate',
    format: (v) => `$${(v / 1000).toFixed(0)}K/mo`,
    color: 'text-orange-600'
  },
  RUNWAY: {
    icon: Clock,
    label: 'Runway',
    format: (v) => `${v} months`,
    color: 'text-blue-600'
  },
  TEAM_SIZE: {
    icon: Users,
    label: 'Team Size',
    format: (v) => `${v}`,
    color: 'text-purple-600'
  },
  REVENUE: {
    icon: DollarSign,
    label: 'Revenue',
    format: (v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`,
    color: 'text-green-600'
  }
};

// Also handle lowercase versions
const METRIC_ALIASES: Record<string, string> = {
  mrr: 'MRR',
  arr: 'ARR',
  burn_rate: 'BURN_RATE',
  burnrate: 'BURN_RATE',
  runway: 'RUNWAY',
  team_size: 'TEAM_SIZE',
  teamsize: 'TEAM_SIZE',
  revenue: 'REVENUE'
};

export function MetricsDashboard({ metricsByType }: MetricsDashboardProps) {
  const metricEntries = Object.entries(metricsByType);

  if (metricEntries.length === 0) return null;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        Key Metrics
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {metricEntries.map(([type, metrics]) => {
          const latest = metrics[0];
          if (!latest) return null;

          // Get config for this metric type
          const normalizedType = METRIC_ALIASES[type.toLowerCase()] || type.toUpperCase();
          const config = METRIC_CONFIG[normalizedType];

          const Icon = config?.icon || TrendingUp;
          const label = config?.label || type.replace(/_/g, ' ');
          const formattedValue = config?.format
            ? config.format(latest.value, latest.unit)
            : latest.unit === 'USD'
              ? `$${latest.value.toLocaleString()}`
              : `${latest.value}${latest.unit ? ` ${latest.unit}` : ''}`;
          const color = config?.color || 'text-gray-900';

          // Special warning for low runway
          const isLowRunway = normalizedType === 'RUNWAY' && latest.value < 6;
          const bgColor = isLowRunway ? 'bg-red-50' : 'bg-gray-50';

          return (
            <div key={type} className={`${bgColor} rounded-lg p-4`}>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Icon className="w-4 h-4" />
                {label}
              </div>
              <div className={`text-xl font-bold ${isLowRunway ? 'text-red-600' : color}`}>
                {formattedValue}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatDate(latest.date)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
