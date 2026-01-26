'use client';

/**
 * UpdateEditor Component
 * Create or edit an update (note, news, investor update, etc.)
 */

import React, { useState } from 'react';
import { X, Save, Loader2, Link, Calendar, User } from 'lucide-react';
import UpdateTypeSelector, { type UpdateType } from './UpdateTypeSelector';

interface UpdateEditorProps {
  personId?: string;
  organizationId?: string;
  dealId?: string;
  personName?: string;
  organizationName?: string;
  dealName?: string;
  onSave?: () => void;
  onCancel?: () => void;
  initialData?: {
    id?: string;
    type?: UpdateType;
    title?: string;
    content?: string;
    updateDate?: string;
    sourceUrl?: string;
    sourceAuthor?: string;
    sourceName?: string;
  };
}

export default function UpdateEditor({
  personId,
  organizationId,
  dealId,
  personName,
  organizationName,
  dealName,
  onSave,
  onCancel,
  initialData,
}: UpdateEditorProps) {
  const [type, setType] = useState<UpdateType>(initialData?.type || 'NOTE');
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [updateDate, setUpdateDate] = useState(
    initialData?.updateDate?.split('T')[0] || new Date().toISOString().split('T')[0]
  );
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl || '');
  const [sourceAuthor, setSourceAuthor] = useState(initialData?.sourceAuthor || '');
  const [sourceName, setSourceName] = useState(initialData?.sourceName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialData?.id;

  // Show source fields for certain types
  const showSourceFields = ['NEWS', 'TWITTER', 'LINKEDIN', 'PRESS_RELEASE'].includes(type);
  const showTitleField = type !== 'NOTE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        type,
        title: title || null,
        content: content.trim(),
        updateDate: new Date(updateDate).toISOString(),
        sourceUrl: sourceUrl || null,
        sourceAuthor: sourceAuthor || null,
        sourceName: sourceName || null,
        personId,
        organizationId,
        dealId,
      };

      const url = isEdit ? `/api/updates/${initialData.id}` : '/api/updates';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save update');
      }

      onSave?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save update');
    } finally {
      setSaving(false);
    }
  };

  const entityLabel = personName || organizationName || dealName || 'Entity';

  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="font-medium text-slate-900">
          {isEdit ? 'Edit Update' : 'Add Update'}
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Entity info */}
        <div className="text-sm text-slate-600">
          Adding update for <span className="font-medium text-slate-900">{entityLabel}</span>
        </div>

        {/* Type selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Type of Update
          </label>
          <UpdateTypeSelector value={type} onChange={setType} />
        </div>

        {/* Title (for non-notes) */}
        {showTitleField && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'NEWS' ? 'Article headline' : 'Title'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            Date
          </label>
          <input
            type="date"
            value={updateDate}
            onChange={(e) => setUpdateDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Source fields */}
        {showSourceFields && (
          <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
            <div className="text-sm font-medium text-slate-700">Source Information</div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">
                <Link className="w-3 h-3 inline mr-1" />
                URL
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  <User className="w-3 h-3 inline mr-1" />
                  Author
                </label>
                <input
                  type="text"
                  value={sourceAuthor}
                  onChange={(e) => setSourceAuthor(e.target.value)}
                  placeholder={type === 'TWITTER' ? '@username' : 'Author name'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Source Name
                </label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder={type === 'NEWS' ? 'TechCrunch, etc.' : 'Platform'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {type === 'NOTE' ? 'Note' : type === 'INVESTOR_UPDATE' ? 'Update Content' : 'Content / Summary'}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              type === 'NOTE'
                ? 'Write your note here...'
                : type === 'INVESTOR_UPDATE'
                ? 'Paste or write the investor update content...'
                : 'Key points or summary of the content...'
            }
            rows={6}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving || !content.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? 'Save Changes' : 'Add Update'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
