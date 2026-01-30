'use client';

import { useState, useEffect } from 'react';
import { PiggyBank, DollarSign, Users, TrendingUp } from 'lucide-react';

interface LPCommitment {
  id: string;
  fundName: string;
  commitmentAmount: string | number;
  calledAmount: string | number;
  distributedAmount: string | number;
  commitmentDate: string;
  status: string;
  person?: {
    id: string;
    fullName: string;
    email?: string;
  };
  organization?: {
    id: string;
    name: string;
  };
}

export default function FundILPsPage() {
  const [commitments, setCommitments] = useState<LPCommitment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLPCommitments();
  }, []);

  const fetchLPCommitments = async () => {
    try {
      const res = await fetch('/api/lp-commitments?fundName=Red%20Beard%20Ventures%20Fund%20I');
      if (res.ok) {
        const data = await res.json();
        setCommitments(data.commitments || []);
      }
    } catch (error) {
      console.error('Failed to fetch LP commitments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0';
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  };

  const totalCommitted = commitments.reduce(
    (sum, c) => sum + (typeof c.commitmentAmount === 'string' ? parseFloat(c.commitmentAmount) : c.commitmentAmount),
    0
  );
  const totalCalled = commitments.reduce(
    (sum, c) => sum + (typeof c.calledAmount === 'string' ? parseFloat(c.calledAmount) : c.calledAmount),
    0
  );
  const totalDistributed = commitments.reduce(
    (sum, c) => sum + (typeof c.distributedAmount === 'string' ? parseFloat(c.distributedAmount) : c.distributedAmount),
    0
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
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
        <h1 className="text-3xl font-bold text-gray-900">Fund I LPs</h1>
        <p className="text-gray-500 mt-1">Limited Partner commitments for RBV Fund I</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Total LPs</div>
              <div className="text-2xl font-bold text-gray-900">{commitments.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <PiggyBank className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Committed</div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCommitted)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Capital Called</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalCalled)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Distributed</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalDistributed)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* LP Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                LP Name
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Commitment
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Called
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Distributed
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {commitments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No LP commitments found for Fund I
                </td>
              </tr>
            ) : (
              commitments.map((commitment) => (
                <tr key={commitment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {commitment.person?.fullName || commitment.organization?.name || 'Unknown'}
                    </div>
                    {commitment.person?.email && (
                      <div className="text-xs text-gray-500">{commitment.person.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(commitment.commitmentAmount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                    {formatCurrency(commitment.calledAmount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                    {formatCurrency(commitment.distributedAmount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        commitment.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : commitment.status === 'fulfilled'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {commitment.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
