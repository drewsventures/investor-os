'use client';

/**
 * EmailActivityFeed Component
 * Displays recent email interactions for a person or organization
 */

import React, { useState, useEffect } from 'react';
import {
  Mail,
  ArrowDownLeft,
  ArrowUpRight,
  Paperclip,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';

interface LinkedPerson {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

interface LinkedOrg {
  id: string;
  name: string;
  domain: string | null;
}

interface EmailMessage {
  id: string;
  threadId: string;
  subject: string | null;
  snippet: string;
  bodyText: string | null;
  from: {
    email: string;
    name: string | null;
  };
  to: string[];
  cc: string[];
  sentAt: string;
  isInbound: boolean;
  hasAttachments: boolean;
  aiSummary: string | null;
  linkedPersons: LinkedPerson[];
  linkedOrganizations: LinkedOrg[];
}

interface EmailActivityFeedProps {
  entityType: 'person' | 'organization';
  entityId: string;
  limit?: number;
}

export default function EmailActivityFeed({
  entityType,
  entityId,
  limit = 10,
}: EmailActivityFeedProps) {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetchEmails();
  }, [entityType, entityId, offset]);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const param = entityType === 'person' ? 'personId' : 'organizationId';
      const res = await fetch(
        `/api/gmail/messages?${param}=${entityId}&limit=${limit}&offset=${offset}`
      );

      if (!res.ok) {
        throw new Error('Failed to fetch emails');
      }

      const data = await res.json();
      setEmails(data.messages || []);
      setTotal(data.pagination?.total || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  if (loading && emails.length === 0) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Mail className="w-12 h-12 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-600 mb-2">{error}</p>
        <button
          onClick={fetchEmails}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-8">
        <Mail className="w-12 h-12 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-600">No email interactions found</p>
        <p className="text-sm text-slate-500 mt-1">
          Connect Gmail and sync to see email history
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Email list */}
      {emails.map((email) => {
        const isExpanded = expandedId === email.id;

        return (
          <div
            key={email.id}
            className="bg-slate-50 rounded-lg overflow-hidden hover:bg-slate-100 transition-colors"
          >
            {/* Email header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : email.id)}
              className="w-full text-left p-4"
            >
              <div className="flex items-start gap-3">
                {/* Direction indicator */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    email.isInbound
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-green-100 text-green-600'
                  }`}
                >
                  {email.isInbound ? (
                    <ArrowDownLeft className="w-4 h-4" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" />
                  )}
                </div>

                {/* Email content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 truncate">
                      {email.from.name || email.from.email}
                    </span>
                    {email.hasAttachments && (
                      <Paperclip className="w-3 h-3 text-slate-400" />
                    )}
                    <span className="text-sm text-slate-500 flex-shrink-0">
                      {formatDate(email.sentAt)}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-700 truncate mt-0.5">
                    {email.subject || '(No subject)'}
                  </div>
                  <div className="text-sm text-slate-500 truncate mt-0.5">
                    {email.snippet}
                  </div>
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
                {/* Email details */}
                <div className="text-xs text-slate-500 space-y-1 mb-3">
                  <div>
                    <span className="font-medium">From:</span>{' '}
                    {email.from.name
                      ? `${email.from.name} <${email.from.email}>`
                      : email.from.email}
                  </div>
                  <div>
                    <span className="font-medium">To:</span>{' '}
                    {email.to.join(', ')}
                  </div>
                  {email.cc.length > 0 && (
                    <div>
                      <span className="font-medium">Cc:</span>{' '}
                      {email.cc.join(', ')}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Date:</span>{' '}
                    {new Date(email.sentAt).toLocaleString()}
                  </div>
                </div>

                {/* AI Summary */}
                {email.aiSummary && (
                  <div className="bg-purple-50 rounded-lg p-3 mb-3">
                    <div className="text-xs font-medium text-purple-700 mb-1">
                      AI Summary
                    </div>
                    <div className="text-sm text-purple-900">
                      {email.aiSummary}
                    </div>
                  </div>
                )}

                {/* Body text */}
                {email.bodyText && (
                  <div className="bg-white rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {email.bodyText}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <span className="text-sm text-slate-600">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-3 py-1 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-3 py-1 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
