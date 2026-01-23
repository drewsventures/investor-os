'use client';

import React from 'react';
import { DollarSign, Calendar, Percent, TrendingUp } from 'lucide-react';

interface Investment {
  id: string;
  investmentDate: Date;
  investmentAmount: number;
  ownership: number | null;
  currentValuation: number | null;
  status: string;
}

interface InvestmentSummaryCardProps {
  investments: Investment[];
}

export function InvestmentSummaryCard({ investments }: InvestmentSummaryCardProps) {
  if (investments.length === 0) return null;

  // Calculate summary values
  const sortedByDate = [...investments].sort(
    (a, b) => new Date(a.investmentDate).getTime() - new Date(b.investmentDate).getTime()
  );

  const firstCheckDate = new Date(sortedByDate[0].investmentDate);
  const totalCapitalDeployed = investments.reduce((sum, inv) => sum + inv.investmentAmount, 0);
  const totalOwnership = investments.reduce((sum, inv) => sum + (inv.ownership || 0), 0);

  // Get most recent valuation from the latest investment with a valuation
  const investmentsWithValuation = investments.filter(inv => inv.currentValuation);
  const mostRecentValuation = investmentsWithValuation.length > 0
    ? investmentsWithValuation.sort(
        (a, b) => new Date(b.investmentDate).getTime() - new Date(a.investmentDate).getTime()
      )[0].currentValuation
    : null;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-green-600" />
        Investment Summary
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Date of First Check */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Calendar className="w-4 h-4" />
            First Check
          </div>
          <div className="text-xl font-bold text-gray-900">
            {formatDate(firstCheckDate)}
          </div>
        </div>

        {/* Total Capital Deployed */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <DollarSign className="w-4 h-4" />
            Capital Deployed
          </div>
          <div className="text-xl font-bold text-green-600">
            {formatCurrency(totalCapitalDeployed)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {investments.length} investment{investments.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Current Ownership */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Percent className="w-4 h-4" />
            Ownership
          </div>
          <div className="text-xl font-bold text-blue-600">
            {totalOwnership > 0 ? `${totalOwnership.toFixed(1)}%` : '—'}
          </div>
        </div>

        {/* Most Recent Valuation (Post-Money) */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            Valuation (Post)
          </div>
          <div className="text-xl font-bold text-gray-900">
            {mostRecentValuation ? formatCurrency(mostRecentValuation) : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
