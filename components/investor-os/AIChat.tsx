'use client';

/**
 * AI Chat Component for Investor OS Brain
 * Reusable chat interface for briefings, queries, and analysis
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, X, Minimize2, Maximize2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  // Optional context to provide to the AI
  context?: {
    entityType?: 'organization' | 'person' | 'deal';
    entityId?: string;
    entityName?: string;
  };
  // Optional initial prompt
  initialPrompt?: string;
  // Callback when chat is closed
  onClose?: () => void;
  // Whether to show in modal or inline
  mode?: 'modal' | 'inline';
  // Custom height for inline mode
  height?: string;
}

export function AIChat({
  context,
  initialPrompt,
  onClose,
  mode = 'inline',
  height = 'h-[600px]'
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send initial prompt if provided
  useEffect(() => {
    if (initialPrompt && messages.length === 0) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || input.trim();
    if (!messageText || loading) return;

    // Add user message
    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Prepare context-aware prompt
      let enhancedPrompt = messageText;
      if (context && !conversationId) {
        // Only add context on first message
        const contextStr = `Context: ${context.entityType} "${context.entityName}" (ID: ${context.entityId})\n\n${messageText}`;
        enhancedPrompt = contextStr;
      }

      const response = await fetch('/api/investor-os/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages,
            { role: 'user', content: enhancedPrompt }
          ],
          conversationId
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'text') {
                  assistantMessage += data.content;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages[newMessages.length - 1]?.role === 'assistant') {
                      newMessages[newMessages.length - 1].content = assistantMessage;
                    } else {
                      newMessages.push({ role: 'assistant', content: assistantMessage });
                    }
                    return newMessages;
                  });
                } else if (data.type === 'done') {
                  setConversationId(data.conversationId);
                } else if (data.type === 'error') {
                  console.error('Stream error:', data.message);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const containerClass = mode === 'modal'
    ? 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
    : '';

  const chatClass = mode === 'modal'
    ? `bg-white rounded-lg shadow-2xl w-full max-w-4xl ${height} flex flex-col ${isMinimized ? 'h-16' : ''}`
    : `bg-white rounded-lg shadow flex flex-col ${height}`;

  const ChatContent = (
    <div className={chatClass}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">AI Brain</h3>
          {context && (
            <span className="text-sm text-gray-500">
              • {context.entityName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mode === 'modal' && (
            <>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-gray-400 hover:text-gray-600"
              >
                {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Ask the AI Brain
                </h4>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Generate briefings, analyze risks, search the knowledge graph, or ask questions about your portfolio.
                </p>
                <div className="flex flex-col gap-2 max-w-md mx-auto">
                  {context ? (
                    <>
                      <button
                        onClick={() => handleSend(`Give me a briefing on ${context.entityName}`)}
                        className="text-sm text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                      >
                        Generate briefing for {context.entityName}
                      </button>
                      <button
                        onClick={() => handleSend(`What are the key risks for ${context.entityName}?`)}
                        className="text-sm text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                      >
                        Analyze risks
                      </button>
                      <button
                        onClick={() => handleSend(`What are the next actions for ${context.entityName}?`)}
                        className="text-sm text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                      >
                        Suggest next actions
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSend('Show me all portfolio companies with low runway')}
                        className="text-sm text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                      >
                        Find companies with low runway
                      </button>
                      <button
                        onClick={() => handleSend('What deals are stuck in diligence?')}
                        className="text-sm text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                      >
                        Review pipeline status
                      </button>
                      <button
                        onClick={() => handleSend('Which LPs should I follow up with?')}
                        className="text-sm text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                      >
                        LP follow-up recommendations
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                </div>
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question or request a briefing..."
                disabled={loading}
                rows={1}
                className="flex-1 resize-none px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        </>
      )}
    </div>
  );

  if (mode === 'modal') {
    return (
      <div className={containerClass} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()}>
          {ChatContent}
        </div>
      </div>
    );
  }

  return ChatContent;
}
