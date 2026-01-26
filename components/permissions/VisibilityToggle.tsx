'use client';

/**
 * Visibility Toggle Component
 * Quick toggle between Private and Shared visibility
 */

import React, { useState } from 'react';
import { Lock, Users, Loader2 } from 'lucide-react';

interface VisibilityToggleProps {
  contentType: string;
  contentId: string;
  currentVisibility: 'PRIVATE' | 'SHARED' | 'RESTRICTED';
  canManage: boolean;
  onVisibilityChange?: (newVisibility: string) => void;
}

export default function VisibilityToggle({
  contentType,
  contentId,
  currentVisibility,
  canManage,
  onVisibilityChange,
}: VisibilityToggleProps) {
  const [visibility, setVisibility] = useState(currentVisibility);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!canManage || loading) return;

    const newVisibility = visibility === 'PRIVATE' ? 'SHARED' : 'PRIVATE';
    setLoading(true);

    try {
      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, contentId, visibility: newVisibility }),
      });

      if (response.ok) {
        setVisibility(newVisibility);
        onVisibilityChange?.(newVisibility);
      }
    } catch (error) {
      console.error('Failed to update visibility:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!canManage) {
    // Read-only badge
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          visibility === 'PRIVATE'
            ? 'bg-amber-100 text-amber-800'
            : visibility === 'RESTRICTED'
            ? 'bg-purple-100 text-purple-800'
            : 'bg-green-100 text-green-800'
        }`}
      >
        {visibility === 'PRIVATE' ? (
          <>
            <Lock className="w-3 h-3" />
            Private
          </>
        ) : visibility === 'RESTRICTED' ? (
          <>
            <Users className="w-3 h-3" />
            Restricted
          </>
        ) : (
          <>
            <Users className="w-3 h-3" />
            Shared
          </>
        )}
      </span>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        visibility === 'PRIVATE'
          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
          : 'bg-green-100 text-green-800 hover:bg-green-200'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={canManage ? 'Click to toggle visibility' : undefined}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : visibility === 'PRIVATE' ? (
        <Lock className="w-3 h-3" />
      ) : (
        <Users className="w-3 h-3" />
      )}
      {visibility === 'PRIVATE' ? 'Private' : 'Shared'}
    </button>
  );
}
