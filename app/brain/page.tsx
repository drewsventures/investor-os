'use client';

/**
 * AI Brain Page - Investor OS
 * Dedicated page for interacting with the AI Brain
 */

import React from 'react';
import { AIChat } from '@/components/investor-os/AIChat';
import { Sparkles, Brain, Zap } from 'lucide-react';

export default function AIBrainPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-8 h-8 text-blue-600" />
            AI Brain
          </h1>
          <p className="text-gray-600 mt-1">
            Your intelligent assistant for investor relations, deal analysis, and portfolio management
          </p>
        </div>

        {/* Capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Briefings</h3>
            </div>
            <p className="text-sm text-gray-600">
              Generate comprehensive briefings on people, organizations, and deals with context-aware insights.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-gray-900">Risk Detection</h3>
            </div>
            <p className="text-sm text-gray-600">
              Automatically detect risks like low runway, burn rate spikes, and relationship staleness.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Knowledge Graph</h3>
            </div>
            <p className="text-sm text-gray-600">
              Search across your entire network of relationships, conversations, and facts with natural language.
            </p>
          </div>
        </div>

        {/* Chat Interface */}
        <AIChat mode="inline" height="h-[calc(100vh-300px)]" />
      </div>
    </div>
  );
}
