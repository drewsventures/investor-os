'use client';

/**
 * RelationshipSummaryCard Component
 * Displays AI-generated relationship summary and strength indicators
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Brain,
  Calendar,
  Mail,
  Lightbulb,
} from 'lucide-react';

interface StrengthFactors {
  recency: number;
  frequency: number;
  engagement: number;
  reciprocity: number;
}

interface RelationshipStrength {
  score: number;
  trend: 'strengthening' | 'stable' | 'weakening';
  factors: StrengthFactors;
  totalEmails: number;
  lastEmailAt: string | null;
  aiSummary: string | null;
  aiRecommendation: string | null;
  calculatedAt: string;
}

interface RelationshipSummaryCardProps {
  personId: string;
  onAnalyze?: () => void;
}

export default function RelationshipSummaryCard({
  personId,
  onAnalyze,
}: RelationshipSummaryCardProps) {
  const [strength, setStrength] = useState<RelationshipStrength | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStrength();
  }, [personId]);

  const fetchStrength = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/gmail/analyze?personId=${personId}`);

      if (!res.ok) {
        throw new Error('Failed to fetch relationship strength');
      }

      const data = await res.json();
      setStrength(data.strength || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      const res = await fetch('/api/gmail/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'person', entityId: personId }),
      });

      if (!res.ok) {
        throw new Error('Analysis failed');
      }

      // Refresh the strength data
      await fetchStrength();
      onAnalyze?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'strengthening':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'weakening':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStrengthColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600 bg-green-100';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStrengthLabel = (score: number) => {
    if (score >= 0.8) return 'Very Strong';
    if (score >= 0.6) return 'Strong';
    if (score >= 0.4) return 'Moderate';
    if (score >= 0.2) return 'Weak';
    return 'Very Weak';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-100 rounded w-1/3" />
          <div className="h-20 bg-slate-100 rounded" />
          <div className="h-4 bg-slate-100 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!strength || strength.totalEmails === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-slate-900">Relationship Insights</h3>
        </div>
        <div className="text-center py-6">
          <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-600">No email interactions found</p>
          <p className="text-sm text-slate-500 mt-1">
            Sync Gmail to analyze this relationship
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-slate-900">Relationship Insights</h3>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
          {analyzing ? 'Analyzing...' : 'Refresh'}
        </button>
      </div>

      {/* Strength Score */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${getStrengthColor(
            strength.score
          )}`}
        >
          {Math.round(strength.score * 100)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">
              {getStrengthLabel(strength.score)}
            </span>
            {getTrendIcon(strength.trend)}
            <span className="text-sm text-slate-500 capitalize">
              {strength.trend}
            </span>
          </div>
          <div className="text-sm text-slate-500 mt-1">
            {strength.totalEmails} emails
            {strength.lastEmailAt && (
              <span> · Last: {formatDate(strength.lastEmailAt)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Factor Breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: 'Recency', value: strength.factors.recency },
          { label: 'Frequency', value: strength.factors.frequency },
          { label: 'Engagement', value: strength.factors.engagement },
          { label: 'Reciprocity', value: strength.factors.reciprocity },
        ].map((factor) => (
          <div key={factor.label} className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">{factor.label}</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${factor.value * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-700 w-8">
                {Math.round(factor.value * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* AI Summary */}
      {strength.aiSummary && (
        <div className="bg-purple-50 rounded-lg p-4 mb-4">
          <div className="text-xs font-medium text-purple-700 mb-2 flex items-center gap-1">
            <Brain className="w-3 h-3" />
            AI Summary
          </div>
          <p className="text-sm text-purple-900">{strength.aiSummary}</p>
        </div>
      )}

      {/* AI Recommendation */}
      {strength.aiRecommendation && (
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            Recommendation
          </div>
          <p className="text-sm text-amber-900">{strength.aiRecommendation}</p>
        </div>
      )}

      {/* Last calculated */}
      {strength.calculatedAt && (
        <div className="text-xs text-slate-400 mt-4 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Updated {formatDate(strength.calculatedAt)}
        </div>
      )}
    </div>
  );
}
