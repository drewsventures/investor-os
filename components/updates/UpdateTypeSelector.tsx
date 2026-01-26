'use client';

/**
 * UpdateTypeSelector Component
 * Select the type of update to create
 */

import React from 'react';
import {
  FileText,
  Newspaper,
  TrendingUp,
  Twitter,
  Linkedin,
  Megaphone,
  MoreHorizontal,
} from 'lucide-react';

export type UpdateType =
  | 'NOTE'
  | 'NEWS'
  | 'INVESTOR_UPDATE'
  | 'TWITTER'
  | 'LINKEDIN'
  | 'PRESS_RELEASE'
  | 'OTHER';

interface UpdateTypeSelectorProps {
  value: UpdateType;
  onChange: (type: UpdateType) => void;
}

const UPDATE_TYPES: Array<{
  type: UpdateType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = [
  {
    type: 'NOTE',
    label: 'Note',
    description: 'Internal note or observation',
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  {
    type: 'NEWS',
    label: 'News Article',
    description: 'External news or media coverage',
    icon: Newspaper,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    type: 'INVESTOR_UPDATE',
    label: 'Investor Update',
    description: 'Forwarded investor/founder update',
    icon: TrendingUp,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  {
    type: 'TWITTER',
    label: 'Twitter/X Post',
    description: 'Important tweet or thread',
    icon: Twitter,
    color: 'text-sky-600',
    bgColor: 'bg-sky-100',
  },
  {
    type: 'LINKEDIN',
    label: 'LinkedIn Post',
    description: 'LinkedIn article or post',
    icon: Linkedin,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  {
    type: 'PRESS_RELEASE',
    label: 'Press Release',
    description: 'Official company announcement',
    icon: Megaphone,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
  },
  {
    type: 'OTHER',
    label: 'Other',
    description: 'Other type of update',
    icon: MoreHorizontal,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
  },
];

export default function UpdateTypeSelector({
  value,
  onChange,
}: UpdateTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {UPDATE_TYPES.map((type) => {
        const Icon = type.icon;
        const isSelected = value === type.type;

        return (
          <button
            key={type.type}
            type="button"
            onClick={() => onChange(type.type)}
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-6 h-6 rounded flex items-center justify-center ${type.bgColor}`}>
                <Icon className={`w-3.5 h-3.5 ${type.color}`} />
              </div>
              <span className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                {type.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 line-clamp-1">
              {type.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
