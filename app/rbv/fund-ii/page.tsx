'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Target,
  Plus,
  RefreshCw,
  Upload,
  Filter,
  DollarSign,
  Users,
  Calendar,
  ChevronRight,
  GripVertical,
} from 'lucide-react';

// LP Stage configuration
const LP_STAGES = [
  { id: 'IDENTIFIED', label: 'Identified', color: 'bg-gray-100 border-gray-300' },
  { id: 'CONTACTED', label: 'Contacted', color: 'bg-blue-50 border-blue-300' },
  { id: 'MEETING_SCHEDULED', label: 'Meeting Scheduled', color: 'bg-indigo-50 border-indigo-300' },
  { id: 'MET', label: 'Met', color: 'bg-purple-50 border-purple-300' },
  { id: 'INTERESTED', label: 'Interested', color: 'bg-pink-50 border-pink-300' },
  { id: 'DUE_DILIGENCE', label: 'Due Diligence', color: 'bg-yellow-50 border-yellow-300' },
  { id: 'SOFT_COMMIT', label: 'Soft Commit', color: 'bg-orange-50 border-orange-300' },
  { id: 'HARD_COMMIT', label: 'Hard Commit', color: 'bg-green-50 border-green-300' },
  { id: 'FUNDED', label: 'Funded', color: 'bg-emerald-100 border-emerald-400' },
] as const;

interface LPProspect {
  id: string;
  stage: string;
  targetAmount: number | null;
  probability: number | null;
  notes: string | null;
  lastContactedAt: string | null;
  nextFollowUp: string | null;
  person?: {
    id: string;
    fullName: string;
    email?: string;
    title?: string;
  };
  organization?: {
    id: string;
    name: string;
    domain?: string;
  };
  assignedTo?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
}

interface LPStats {
  total: number;
  byStage: Record<string, number>;
  totalTargetAmount: number;
  totalSoftCommit: number;
  totalHardCommit: number;
  totalFunded: number;
}

export default function FundIIFundraisePage() {
  const [prospects, setProspects] = useState<LPProspect[]>([]);
  const [stats, setStats] = useState<LPStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [draggedProspect, setDraggedProspect] = useState<string | null>(null);

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/lp-prospects');
      if (res.ok) {
        const data = await res.json();
        setProspects(data.prospects || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Failed to fetch LP prospects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (prospectId: string) => {
    setDraggedProspect(prospectId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    if (!draggedProspect) return;

    const prospect = prospects.find((p) => p.id === draggedProspect);
    if (!prospect || prospect.stage === newStage) {
      setDraggedProspect(null);
      return;
    }

    // Optimistic update
    setProspects((prev) =>
      prev.map((p) => (p.id === draggedProspect ? { ...p, stage: newStage } : p))
    );

    try {
      const res = await fetch(`/api/lp-prospects/${draggedProspect}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!res.ok) {
        // Revert on error
        setProspects((prev) =>
          prev.map((p) => (p.id === draggedProspect ? { ...p, stage: prospect.stage } : p))
        );
      } else {
        // Refresh stats
        fetchProspects();
      }
    } catch (error) {
      console.error('Failed to update prospect stage:', error);
      // Revert on error
      setProspects((prev) =>
        prev.map((p) => (p.id === draggedProspect ? { ...p, stage: prospect.stage } : p))
      );
    }

    setDraggedProspect(null);
  };

  const handleImportFromAttio = async () => {
    setImporting(true);
    try {
      const res = await fetch('/api/attio/import-lps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listName: 'RBV LP Fundraising Fund II' }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Imported ${data.imported} LP prospects from Attio`);
        fetchProspects();
      } else {
        const error = await res.json();
        alert(`Import failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to import from Attio:', error);
      alert('Failed to import from Attio');
    } finally {
      setImporting(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '—';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const getProspectsByStage = (stage: string) => {
    return prospects.filter((p) => p.stage === stage);
  };

  const getStageAmount = (stage: string) => {
    return prospects
      .filter((p) => p.stage === stage)
      .reduce((sum, p) => sum + (p.targetAmount || 0), 0);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="flex gap-4 overflow-x-auto">
            {LP_STAGES.map((stage) => (
              <div key={stage.id} className="w-72 flex-shrink-0">
                <div className="h-8 bg-gray-200 rounded mb-3"></div>
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-24 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fund II Fundraise</h1>
          <p className="text-gray-500 text-sm mt-0.5">LP Pipeline for Red Beard Ventures Fund II</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchProspects}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleImportFromAttio}
            disabled={importing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Importing...' : 'Import from Attio'}
          </button>
          <Link
            href="/rbv/fund-ii/prospects/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Prospect
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Total Prospects</div>
          <div className="text-2xl font-bold text-gray-900">{stats?.total || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Pipeline Value</div>
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(stats?.totalTargetAmount || 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Soft Commits</div>
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(stats?.totalSoftCommit || 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Hard Commits</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(stats?.totalHardCommit || 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Funded</div>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(stats?.totalFunded || 0)}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-max pb-4">
          {LP_STAGES.map((stage) => {
            const stageProspects = getProspectsByStage(stage.id);
            const stageAmount = getStageAmount(stage.id);

            return (
              <div
                key={stage.id}
                className={`w-72 flex-shrink-0 ${stage.color} border-2 rounded-xl flex flex-col`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Stage Header */}
                <div className="p-3 border-b border-gray-200 bg-white/50 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 text-sm">{stage.label}</h3>
                    <span className="text-xs bg-white px-2 py-0.5 rounded-full text-gray-600">
                      {stageProspects.length}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatCurrency(stageAmount)}
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {stageProspects.map((prospect) => (
                    <div
                      key={prospect.id}
                      draggable
                      onDragStart={() => handleDragStart(prospect.id)}
                      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab hover:shadow-md transition-shadow ${
                        draggedProspect === prospect.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <Link
                            href={
                              prospect.person
                                ? `/people/${prospect.person.id}`
                                : prospect.organization
                                ? `/organizations/${prospect.organization.id}`
                                : '#'
                            }
                            className="font-medium text-gray-900 text-sm hover:text-purple-600 truncate block"
                          >
                            {prospect.person?.fullName || prospect.organization?.name || 'Unknown'}
                          </Link>
                          {prospect.person?.title && (
                            <div className="text-xs text-gray-500 truncate">{prospect.person.title}</div>
                          )}
                          {prospect.organization && prospect.person && (
                            <div className="text-xs text-gray-500 truncate">
                              {prospect.organization.name}
                            </div>
                          )}

                          <div className="mt-2 flex items-center gap-2">
                            {prospect.targetAmount && (
                              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                <DollarSign className="w-3 h-3" />
                                {formatCurrency(prospect.targetAmount)}
                              </span>
                            )}
                            {prospect.nextFollowUp && (
                              <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                <Calendar className="w-3 h-3" />
                                {new Date(prospect.nextFollowUp).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {stageProspects.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      Drop prospects here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
