'use client';

import React from 'react';

interface RelationshipStrengthIndicatorProps {
  strength: number | null; // 0.0 to 1.0
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
  onClick?: () => void;
}

/**
 * Relationship Strength Indicator Component
 * Displays relationship strength as a visual progress bar with color coding
 *
 * Color coding:
 * - Red (0.0-0.3): Weak/Cold relationship
 * - Yellow (0.3-0.7): Medium relationship
 * - Green (0.7-1.0): Strong/Warm relationship
 */
export default function RelationshipStrengthIndicator({
  strength,
  showLabel = true,
  size = 'md',
  editable = false,
  onClick
}: RelationshipStrengthIndicatorProps) {
  if (strength === null) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full">
          <div className="h-full bg-gray-300 rounded-full" style={{ width: '0%' }} />
        </div>
        {showLabel && <span className="text-sm text-gray-400">—</span>}
      </div>
    );
  }

  // Ensure strength is between 0 and 1
  const normalizedStrength = Math.max(0, Math.min(1, strength));
  const percentage = normalizedStrength * 100;

  // Determine color based on strength
  let barColor = '';
  let textColor = '';
  let label = '';

  if (normalizedStrength < 0.3) {
    barColor = 'bg-red-500';
    textColor = 'text-red-600';
    label = 'Weak';
  } else if (normalizedStrength < 0.7) {
    barColor = 'bg-yellow-500';
    textColor = 'text-yellow-600';
    label = 'Medium';
  } else {
    barColor = 'bg-green-500';
    textColor = 'text-green-600';
    label = 'Strong';
  }

  // Size variants
  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3'
  };
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const barHeight = heights[size];
  const textSize = textSizes[size];

  return (
    <div
      className={`flex items-center gap-2 ${editable ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={editable ? onClick : undefined}
      title={editable ? 'Click to edit' : `Relationship strength: ${normalizedStrength.toFixed(2)} (${label})`}
    >
      {/* Progress bar */}
      <div className={`flex-1 min-w-[80px] ${barHeight} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Numeric value and label */}
      {showLabel && (
        <div className="flex items-center gap-1">
          <span className={`${textSize} ${textColor} font-medium`}>
            {normalizedStrength.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Strength Badge Component
 * Displays relationship strength as a colored badge
 */
export function RelationshipStrengthBadge({ strength }: { strength: number | null }) {
  if (strength === null) {
    return <span className="text-gray-400 text-xs">—</span>;
  }

  const normalizedStrength = Math.max(0, Math.min(1, strength));

  let badgeColor = '';
  let label = '';

  if (normalizedStrength < 0.3) {
    badgeColor = 'bg-red-100 text-red-800';
    label = 'Weak';
  } else if (normalizedStrength < 0.7) {
    badgeColor = 'bg-yellow-100 text-yellow-800';
    label = 'Medium';
  } else {
    badgeColor = 'bg-green-100 text-green-800';
    label = 'Strong';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}
      title={`Strength: ${normalizedStrength.toFixed(2)}`}
    >
      {label}
    </span>
  );
}
