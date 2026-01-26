'use client';

/**
 * Private Content Card Component
 * Shows metadata and request access button for private content
 */

import React, { useState } from 'react';
import { Lock, Key, CheckCircle, Loader2, Calendar, User as UserIcon } from 'lucide-react';

interface PrivateContentCardProps {
  contentType: string;
  contentId: string;
  metadata: {
    date?: Date | string;
    subject?: string;
    title?: string;
    participants?: string[];
    from?: string;
  };
  onAccessGranted?: () => void;
}

export default function PrivateContentCard({
  contentType,
  contentId,
  metadata,
  onAccessGranted,
}: PrivateContentCardProps) {
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestAccess = async () => {
    setRequesting(true);
    setError(null);

    try {
      const response = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, contentId }),
      });

      if (response.ok) {
        setRequested(true);
        onAccessGranted?.();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to request access');
      }
    } catch {
      setError('Failed to request access');
    } finally {
      setRequesting(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Lock className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h4 className="font-medium text-slate-900">Private Content</h4>
          <p className="text-sm text-slate-500">
            The content of this item is restricted
          </p>
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-2 mb-4">
        {(metadata.subject || metadata.title) && (
          <div className="flex items-start gap-2">
            <span className="text-sm text-slate-500 min-w-[60px]">
              {metadata.subject ? 'Subject:' : 'Title:'}
            </span>
            <span className="text-sm text-slate-900 font-medium">
              {metadata.subject || metadata.title}
            </span>
          </div>
        )}

        {metadata.date && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">
              {formatDate(metadata.date)}
            </span>
          </div>
        )}

        {metadata.from && (
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">
              {metadata.from}
            </span>
          </div>
        )}

        {metadata.participants && metadata.participants.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-sm text-slate-500 min-w-[80px]">Participants:</span>
            <div className="flex flex-wrap gap-1">
              {metadata.participants.slice(0, 3).map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-200 text-slate-700"
                >
                  {p}
                </span>
              ))}
              {metadata.participants.length > 3 && (
                <span className="text-xs text-slate-500">
                  +{metadata.participants.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Request Access Button */}
      {!requested ? (
        <button
          onClick={handleRequestAccess}
          disabled={requesting}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {requesting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Key className="w-4 h-4" />
          )}
          {requesting ? 'Requesting...' : 'Request Access'}
        </button>
      ) : (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Access requested - awaiting approval</span>
        </div>
      )}
    </div>
  );
}
