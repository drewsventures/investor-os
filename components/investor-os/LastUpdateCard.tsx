'use client';

import React from 'react';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface Conversation {
  id: string;
  conversationDate: Date;
  title: string;
  medium: string;
}

interface Fact {
  id: string;
  key: string;
  validFrom: Date;
  sourceType: string;
}

interface LastUpdateCardProps {
  conversations: Conversation[];
  facts: Fact[];
  updatedAt?: Date;
}

export function LastUpdateCard({ conversations, facts, updatedAt }: LastUpdateCardProps) {
  // Find the most recent update from conversations or facts
  const getMostRecentUpdate = (): { date: Date; source: string } | null => {
    let mostRecent: { date: Date; source: string } | null = null;

    // Check conversations for reports or updates
    const reportConversations = conversations.filter(
      conv => conv.medium === 'REPORT' ||
              conv.title.toLowerCase().includes('report') ||
              conv.title.toLowerCase().includes('update')
    );

    if (reportConversations.length > 0) {
      const latestConv = reportConversations.sort(
        (a, b) => new Date(b.conversationDate).getTime() - new Date(a.conversationDate).getTime()
      )[0];
      mostRecent = { date: new Date(latestConv.conversationDate), source: 'Report' };
    }

    // Check facts for recent updates
    if (facts.length > 0) {
      const latestFact = [...facts].sort(
        (a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime()
      )[0];
      const factDate = new Date(latestFact.validFrom);

      if (!mostRecent || factDate > mostRecent.date) {
        mostRecent = { date: factDate, source: 'Fact update' };
      }
    }

    // Fall back to any conversation
    if (!mostRecent && conversations.length > 0) {
      const latestConv = [...conversations].sort(
        (a, b) => new Date(b.conversationDate).getTime() - new Date(a.conversationDate).getTime()
      )[0];
      mostRecent = { date: new Date(latestConv.conversationDate), source: 'Last contact' };
    }

    // Fall back to updatedAt
    if (!mostRecent && updatedAt) {
      mostRecent = { date: new Date(updatedAt), source: 'Record update' };
    }

    return mostRecent;
  };

  const lastUpdate = getMostRecentUpdate();

  if (!lastUpdate) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Clock className="w-4 h-4" />
          Last Update
        </div>
        <div className="text-gray-500">No updates recorded</div>
      </div>
    );
  }

  // Calculate days since last update
  const now = new Date();
  const daysSince = Math.floor(
    (now.getTime() - lastUpdate.date.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Determine status based on days since
  const isStale = daysSince > 30;
  const isWarning = daysSince > 14 && daysSince <= 30;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysText = () => {
    if (daysSince === 0) return 'Today';
    if (daysSince === 1) return 'Yesterday';
    return `${daysSince} days ago`;
  };

  const bgColor = isStale ? 'bg-red-50' : isWarning ? 'bg-yellow-50' : 'bg-gray-50';
  const textColor = isStale ? 'text-red-700' : isWarning ? 'text-yellow-700' : 'text-gray-700';

  return (
    <div className={`rounded-lg p-4 ${bgColor}`}>
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
        <Clock className="w-4 h-4" />
        Last Update
      </div>
      <div className="flex items-center gap-2">
        {isStale ? (
          <AlertCircle className="w-4 h-4 text-red-500" />
        ) : isWarning ? (
          <AlertCircle className="w-4 h-4 text-yellow-500" />
        ) : (
          <CheckCircle className="w-4 h-4 text-green-500" />
        )}
        <div>
          <div className={`font-semibold ${textColor}`}>
            {getDaysText()}
          </div>
          <div className="text-xs text-gray-500">
            {lastUpdate.source} • {formatDate(lastUpdate.date)}
          </div>
        </div>
      </div>
      {isStale && (
        <div className="mt-2 text-xs text-red-600">
          Consider requesting an update
        </div>
      )}
    </div>
  );
}
