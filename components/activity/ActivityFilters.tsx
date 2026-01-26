'use client';

/**
 * ActivityFilters Component
 * Filter buttons for activity types
 */

import React from 'react';
import {
  Mail,
  Video,
  FileText,
  Newspaper,
  TrendingUp,
  Twitter,
  Linkedin,
  Megaphone,
  Activity,
} from 'lucide-react';
import { type ActivityType, ACTIVITY_TYPE_INFO } from '@/lib/activity/types';

const ICON_MAP: Record<string, React.ElementType> = {
  Mail,
  Video,
  FileText,
  Newspaper,
  TrendingUp,
  Twitter,
  Linkedin,
  Megaphone,
  Activity,
  DollarSign: TrendingUp, // Fallback
};

interface ActivityFiltersProps {
  selectedTypes: ActivityType[];
  onTypeChange: (types: ActivityType[]) => void;
  counts?: Record<ActivityType, number>;
}

const FILTER_OPTIONS: { type: ActivityType; show: boolean }[] = [
  { type: 'email', show: true },
  { type: 'meeting', show: true },
  { type: 'note', show: true },
  { type: 'news', show: true },
  { type: 'investor_update', show: true },
  { type: 'twitter', show: true },
  { type: 'linkedin', show: true },
  { type: 'press_release', show: true },
  { type: 'other', show: true },
];

export default function ActivityFilters({
  selectedTypes,
  onTypeChange,
  counts,
}: ActivityFiltersProps) {
  const handleToggle = (type: ActivityType) => {
    if (selectedTypes.length === 0) {
      // All are selected, clicking one means only that one
      onTypeChange([type]);
    } else if (selectedTypes.includes(type)) {
      // Remove this type
      const newTypes = selectedTypes.filter((t) => t !== type);
      onTypeChange(newTypes); // Empty means all
    } else {
      // Add this type
      onTypeChange([...selectedTypes, type]);
    }
  };

  const handleShowAll = () => {
    onTypeChange([]);
  };

  const isAllSelected = selectedTypes.length === 0;

  return (
    <div className="flex flex-wrap gap-2">
      {/* All button */}
      <button
        onClick={handleShowAll}
        className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
          isAllSelected
            ? 'bg-slate-800 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        All
      </button>

      {/* Type filters */}
      {FILTER_OPTIONS.filter((o) => o.show).map(({ type }) => {
        const info = ACTIVITY_TYPE_INFO[type];
        const Icon = ICON_MAP[info.icon] || Activity;
        const isSelected = isAllSelected || selectedTypes.includes(type);
        const count = counts?.[type] ?? 0;

        return (
          <button
            key={type}
            onClick={() => handleToggle(type)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-colors ${
              isSelected
                ? `${info.bgColor} ${info.color}`
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{info.label}</span>
            {count > 0 && (
              <span
                className={`text-xs ${
                  isSelected ? 'opacity-70' : 'text-slate-400'
                }`}
              >
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
