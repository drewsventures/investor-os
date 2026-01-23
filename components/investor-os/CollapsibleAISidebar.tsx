'use client';

import React, { useEffect } from 'react';
import { Sparkles, PanelRightClose } from 'lucide-react';
import { AIChat } from './AIChat';

interface CollapsibleAISidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  organizationId: string;
  organizationName: string;
}

export function CollapsibleAISidebar({
  isOpen,
  onToggle,
  organizationId,
  organizationName
}: CollapsibleAISidebarProps) {
  // Persist state to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('org-ai-sidebar-open');
    if (saved !== null) {
      const shouldBeOpen = JSON.parse(saved);
      if (shouldBeOpen !== isOpen) {
        // Don't auto-toggle on mount, just save current state
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('org-ai-sidebar-open', JSON.stringify(isOpen));
  }, [isOpen]);

  return (
    <>
      {/* Sidebar Panel */}
      <div
        className={`fixed right-0 top-0 h-full bg-white shadow-xl border-l border-gray-200
          transition-transform duration-300 ease-in-out z-40
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          w-96`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">AI Brain</span>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close AI Brain"
          >
            <PanelRightClose className="w-5 h-5" />
          </button>
        </div>

        {/* AI Chat Content */}
        <div className="h-[calc(100%-56px)]">
          <AIChat
            mode="inline"
            height="h-full"
            context={{
              entityType: 'organization',
              entityId: organizationId,
              entityName: organizationName
            }}
          />
        </div>
      </div>

      {/* Floating Toggle Button (when sidebar is closed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed right-6 bottom-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all z-40 group"
          title="Open AI Brain"
        >
          <Sparkles className="w-6 h-6" />
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Ask AI Brain
          </span>
        </button>
      )}

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
