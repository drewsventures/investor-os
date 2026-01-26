'use client';

/**
 * ActivityItem Component
 * Renders a single activity item in the feed
 */

import React, { useState } from 'react';
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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  User,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { type Activity as ActivityData, ACTIVITY_TYPE_INFO } from '@/lib/activity/types';

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
  DollarSign: TrendingUp,
};

interface ActivityItemProps {
  activity: ActivityData;
  defaultExpanded?: boolean;
}

export default function ActivityItem({ activity, defaultExpanded = false }: ActivityItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const info = ACTIVITY_TYPE_INFO[activity.type];
  const Icon = ICON_MAP[info.icon] || Activity;

  const formatDate = (date: Date) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Render type-specific icon
  const renderIcon = () => {
    if (activity.type === 'email') {
      const isInbound = activity.metadata.from && !activity.metadata.from.includes('@redbeard') && !activity.metadata.from.includes('@denarii');
      return (
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isInbound ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
          }`}
        >
          {isInbound ? (
            <ArrowDownLeft className="w-4 h-4" />
          ) : (
            <ArrowUpRight className="w-4 h-4" />
          )}
        </div>
      );
    }

    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${info.bgColor} ${info.color}`}>
        <Icon className="w-4 h-4" />
      </div>
    );
  };

  // Render type-specific subtitle
  const renderSubtitle = () => {
    switch (activity.type) {
      case 'email':
        return (
          <span className="text-slate-500">
            {activity.metadata.from || 'Unknown sender'}
          </span>
        );
      case 'meeting':
        return (
          <span className="text-slate-500 flex items-center gap-1">
            {activity.metadata.duration && (
              <>
                <Clock className="w-3 h-3" />
                {formatDuration(activity.metadata.duration)}
              </>
            )}
            {activity.metadata.participants && activity.metadata.participants.length > 0 && (
              <>
                <span className="mx-1">·</span>
                <User className="w-3 h-3" />
                {activity.metadata.participants.length} participants
              </>
            )}
          </span>
        );
      case 'news':
      case 'press_release':
        return (
          <span className="text-slate-500">
            {activity.metadata.sourceName || 'Unknown source'}
          </span>
        );
      case 'twitter':
      case 'linkedin':
        return (
          <span className="text-slate-500">
            {activity.metadata.sourceAuthor || 'Unknown author'}
          </span>
        );
      default:
        if (activity.author) {
          return (
            <span className="text-slate-500">
              by {activity.author.fullName}
            </span>
          );
        }
        return null;
    }
  };

  return (
    <div className="bg-slate-50 rounded-lg overflow-hidden hover:bg-slate-100 transition-colors">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-4"
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          {renderIcon()}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${info.bgColor} ${info.color}`}>
                {info.label}
              </span>
              <span className="text-sm text-slate-500 flex-shrink-0">
                {formatDate(activity.date)}
              </span>
            </div>

            {/* Title */}
            <div className="font-medium text-slate-900 truncate mt-1">
              {activity.title}
            </div>

            {/* Subtitle */}
            <div className="text-sm mt-0.5">
              {renderSubtitle()}
            </div>

            {/* Summary/snippet */}
            {activity.summary && !isExpanded && (
              <div className="text-sm text-slate-500 truncate mt-1">
                {activity.summary}
              </div>
            )}
          </div>

          {/* Expand indicator */}
          <div className="flex-shrink-0 text-slate-400">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-200 mt-2 pt-3">
          {/* Type-specific details */}
          {activity.type === 'email' && (
            <div className="text-xs text-slate-500 space-y-1 mb-3">
              {activity.metadata.from && (
                <div>
                  <span className="font-medium">From:</span> {activity.metadata.from}
                </div>
              )}
              {activity.metadata.to && activity.metadata.to.length > 0 && (
                <div>
                  <span className="font-medium">To:</span> {activity.metadata.to.join(', ')}
                </div>
              )}
              {activity.metadata.cc && activity.metadata.cc.length > 0 && (
                <div>
                  <span className="font-medium">Cc:</span> {activity.metadata.cc.join(', ')}
                </div>
              )}
            </div>
          )}

          {activity.type === 'meeting' && activity.metadata.participants && (
            <div className="mb-3">
              <div className="text-xs font-medium text-slate-500 mb-2">Participants</div>
              <div className="flex flex-wrap gap-1">
                {activity.metadata.participants.map((p, i) => (
                  <span
                    key={i}
                    className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          {activity.content && (
            <div className="bg-white rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {activity.content}
            </div>
          )}

          {/* Source link */}
          {activity.sourceUrl && (
            <a
              href={activity.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="w-4 h-4" />
              View source
            </a>
          )}
        </div>
      )}
    </div>
  );
}
