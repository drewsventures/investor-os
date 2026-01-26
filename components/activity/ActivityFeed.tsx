'use client';

/**
 * ActivityFeed Component
 * Unified activity timeline for person/organization profiles
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Plus, Calendar } from 'lucide-react';
import ActivityItem from './ActivityItem';
import ActivityFilters from './ActivityFilters';
import { type Activity as ActivityData, type ActivityType } from '@/lib/activity/types';

interface ActivityFeedProps {
  personId?: string;
  organizationId?: string;
  dealId?: string;
  onAddUpdate?: () => void;
  limit?: number;
}

export default function ActivityFeed({
  personId,
  organizationId,
  dealId,
  onAddUpdate,
  limit = 20,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>([]);
  const [counts, setCounts] = useState<Record<ActivityType, number> | undefined>();
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchActivities = useCallback(async (reset = false) => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (personId) params.set('personId', personId);
      if (organizationId) params.set('organizationId', organizationId);
      if (dealId) params.set('dealId', dealId);
      if (selectedTypes.length > 0) params.set('types', selectedTypes.join(','));
      params.set('limit', String(limit));
      params.set('offset', String(reset ? 0 : offset));

      const res = await fetch(`/api/activity?${params}`);

      if (!res.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await res.json();

      if (reset) {
        setActivities(data.activities);
        setOffset(0);
      } else {
        setActivities(data.activities);
      }
      setTotal(data.total);
      setHasMore(data.hasMore);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [personId, organizationId, dealId, selectedTypes, limit, offset]);

  const fetchCounts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (personId) params.set('personId', personId);
      if (organizationId) params.set('organizationId', organizationId);
      if (dealId) params.set('dealId', dealId);
      params.set('countsOnly', 'true');

      const res = await fetch(`/api/activity?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCounts(data.counts);
      }
    } catch {
      // Silently fail - counts are optional
    }
  }, [personId, organizationId, dealId]);

  useEffect(() => {
    fetchActivities(true);
    fetchCounts();
  }, [personId, organizationId, dealId, selectedTypes]);

  const handleTypeChange = (types: ActivityType[]) => {
    setSelectedTypes(types);
    setOffset(0);
  };

  const handleLoadMore = () => {
    setOffset(offset + limit);
    fetchActivities();
  };

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.date);
    const key = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(activity);
    return groups;
  }, {} as Record<string, ActivityData[]>);

  if (loading && activities.length === 0) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-10 bg-slate-100 rounded-lg" />
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Activity className="w-12 h-12 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-600 mb-2">{error}</p>
        <button
          onClick={() => fetchActivities(true)}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters and add button */}
      <div className="flex items-start justify-between gap-4">
        <ActivityFilters
          selectedTypes={selectedTypes}
          onTypeChange={handleTypeChange}
          counts={counts}
        />
        {onAddUpdate && (
          <button
            onClick={onAddUpdate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Update
          </button>
        )}
      </div>

      {/* Empty state */}
      {activities.length === 0 && (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-600">No activities found</p>
          <p className="text-sm text-slate-500 mt-1">
            Activities will appear here as you interact with this{' '}
            {personId ? 'person' : organizationId ? 'organization' : 'deal'}
          </p>
        </div>
      )}

      {/* Activity timeline */}
      {Object.entries(groupedActivities).map(([date, dateActivities]) => (
        <div key={date}>
          {/* Date header */}
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">{date}</span>
          </div>

          {/* Activities for this date */}
          <div className="space-y-3 ml-6">
            {dateActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      ))}

      {/* Load more / pagination */}
      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load more activities'}
          </button>
        </div>
      )}

      {/* Total count */}
      {total > 0 && (
        <div className="text-center text-sm text-slate-500">
          Showing {activities.length} of {total} activities
        </div>
      )}
    </div>
  );
}
