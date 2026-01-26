'use client';

/**
 * ActionItemsPanel Component
 * Displays AI-extracted action items from email conversations
 */

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Circle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  User,
} from 'lucide-react';

interface ActionItem {
  description: string;
  owner: string;
  dueDate: string | null;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  sourceEmailId: string;
}

interface ActionItemsPanelProps {
  personId: string;
}

export default function ActionItemsPanel({ personId }: ActionItemsPanelProps) {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Action items are extracted on-demand, so we don't auto-load
    setLoading(false);
  }, [personId]);

  const extractActionItems = async () => {
    try {
      setExtracting(true);
      const res = await fetch('/api/gmail/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'person', entityId: personId }),
      });

      if (!res.ok) {
        throw new Error('Failed to extract action items');
      }

      const data = await res.json();
      setActionItems(data.data?.actionItems || []);
      setCompletedIds(new Set());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract');
    } finally {
      setExtracting(false);
    }
  };

  const toggleComplete = (index: number) => {
    const newCompleted = new Set(completedIds);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedIds(newCompleted);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-slate-600 bg-slate-100';
    }
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} days overdue`, isOverdue: true };
    } else if (diffDays === 0) {
      return { text: 'Due today', isOverdue: false };
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', isOverdue: false };
    } else if (diffDays <= 7) {
      return { text: `Due in ${diffDays} days`, isOverdue: false };
    } else {
      return {
        text: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        isOverdue: false,
      };
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-100 rounded w-1/3" />
          <div className="h-16 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-900">Action Items</h3>
          {actionItems.length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
              {actionItems.length - completedIds.size} open
            </span>
          )}
        </div>
        <button
          onClick={extractActionItems}
          disabled={extracting}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${extracting ? 'animate-spin' : ''}`} />
          {extracting ? 'Extracting...' : 'Extract from emails'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 rounded-lg p-3 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {actionItems.length === 0 && !extracting && (
        <div className="text-center py-8">
          <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-600">No action items found</p>
          <p className="text-sm text-slate-500 mt-1">
            Click &quot;Extract from emails&quot; to analyze recent conversations
          </p>
        </div>
      )}

      {/* Action items list */}
      {actionItems.length > 0 && (
        <div className="space-y-3">
          {actionItems.map((item, index) => {
            const isCompleted = completedIds.has(index);
            const dueInfo = item.dueDate ? formatDueDate(item.dueDate) : null;

            return (
              <div
                key={index}
                className={`rounded-lg p-4 transition-all ${
                  isCompleted ? 'bg-green-50 opacity-60' : 'bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleComplete(index)}
                    className="flex-shrink-0 mt-0.5"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 hover:text-blue-600" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        isCompleted
                          ? 'text-slate-500 line-through'
                          : 'text-slate-900'
                      }`}
                    >
                      {item.description}
                    </p>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* Owner */}
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <User className="w-3 h-3" />
                        {item.owner === 'me' ? 'You' : item.owner}
                      </span>

                      {/* Due date */}
                      {dueInfo && (
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${
                            dueInfo.isOverdue
                              ? 'text-red-600'
                              : 'text-slate-500'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          {dueInfo.text}
                        </span>
                      )}

                      {/* Priority */}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(
                          item.priority
                        )}`}
                      >
                        {item.priority}
                      </span>

                      {/* Confidence */}
                      <span className="text-xs text-slate-400">
                        {Math.round(item.confidence * 100)}% confident
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Summary */}
          {completedIds.size > 0 && (
            <div className="text-sm text-green-600 pt-2 border-t border-slate-200">
              {completedIds.size} of {actionItems.length} items completed
            </div>
          )}
        </div>
      )}
    </div>
  );
}
