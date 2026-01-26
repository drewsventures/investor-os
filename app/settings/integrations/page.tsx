'use client';

/**
 * Integrations Settings Page
 * Manage Gmail and other integrations
 */

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  AlertCircle,
  Users,
  Building2,
  Video,
  Key,
  Loader2,
} from 'lucide-react';

interface GmailStats {
  totalEmails: number;
  inboundEmails: number;
  outboundEmails: number;
  linkedPersons: number;
  linkedOrganizations: number;
  oldestEmail: string | null;
  newestEmail: string | null;
  topContacts: Array<{
    personId: string;
    name: string;
    email: string | null;
    emailCount: number;
  }>;
}

interface GmailStatus {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  tokenExpiresAt: string | null;
  stats: GmailStats | null;
}

interface FirefliesStatus {
  connected: boolean;
  connection: {
    email: string;
    firefliesUserId: string | null;
    lastSyncAt: string | null;
    syncCursor: string | null;
    webhookEnabled: boolean;
    connectedAt: string;
  } | null;
  stats: {
    totalMeetings: number;
    linkedParticipants: number;
    linkedOrganizations: number;
    lastSyncAt: string | null;
    oldestMeeting: string | null;
    newestMeeting: string | null;
  } | null;
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [firefliesStatus, setFirefliesStatus] = useState<FirefliesStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [firefliesLoading, setFirefliesLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [firefliesSyncing, setFirefliesSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [firefliesDisconnecting, setFirefliesDisconnecting] = useState(false);
  const [firefliesApiKey, setFirefliesApiKey] = useState('');
  const [firefliesConnecting, setFirefliesConnecting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchGmailStatus();
    fetchFirefliesStatus();

    // Check for OAuth callback messages
    const gmailParam = searchParams.get('gmail');
    const errorParam = searchParams.get('error');

    if (gmailParam === 'connected') {
      setMessage({ type: 'success', text: 'Gmail connected successfully!' });
    } else if (errorParam) {
      setMessage({ type: 'error', text: decodeURIComponent(errorParam) });
    }
  }, [searchParams]);

  const fetchGmailStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/gmail/status');
      const data = await res.json();
      setGmailStatus(data);
    } catch (error) {
      console.error('Failed to fetch Gmail status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/gmail/sync', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Synced ${data.result.messagesCreated} new emails!`,
        });
        fetchGmailStatus();
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Sync failed',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to sync emails',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        'Are you sure you want to disconnect Gmail? This will remove the connection but keep synced emails.'
      )
    ) {
      return;
    }

    try {
      setDisconnecting(true);
      const res = await fetch('/api/gmail/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteEmails: false }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Gmail disconnected' });
        fetchGmailStatus();
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect' });
    } finally {
      setDisconnecting(false);
    }
  };

  const fetchFirefliesStatus = async () => {
    try {
      setFirefliesLoading(true);
      const res = await fetch('/api/fireflies/status');
      const data = await res.json();
      setFirefliesStatus(data);
    } catch (error) {
      console.error('Failed to fetch Fireflies status:', error);
    } finally {
      setFirefliesLoading(false);
    }
  };

  const handleFirefliesConnect = async () => {
    if (!firefliesApiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter your Fireflies API key' });
      return;
    }

    try {
      setFirefliesConnecting(true);
      const res = await fetch('/api/fireflies/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: firefliesApiKey }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Fireflies connected successfully!' });
        setFirefliesApiKey('');
        fetchFirefliesStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to connect Fireflies' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect Fireflies' });
    } finally {
      setFirefliesConnecting(false);
    }
  };

  const handleFirefliesSync = async () => {
    try {
      setFirefliesSyncing(true);
      const res = await fetch('/api/fireflies/sync', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Synced ${data.transcriptsCreated} new meetings!`,
        });
        fetchFirefliesStatus();
      } else {
        setMessage({
          type: 'error',
          text: data.errors?.[0] || 'Sync failed',
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to sync meetings' });
    } finally {
      setFirefliesSyncing(false);
    }
  };

  const handleFirefliesDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Fireflies? This will remove the connection but keep synced meetings.')) {
      return;
    }

    try {
      setFirefliesDisconnecting(true);
      const res = await fetch('/api/fireflies/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteMeetings: false }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Fireflies disconnected' });
        fetchFirefliesStatus();
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect' });
    } finally {
      setFirefliesDisconnecting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Integrations</h1>
          <p className="text-slate-600 mt-1">
            Connect external services to enrich your investor data
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-current opacity-60 hover:opacity-100"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Gmail Integration Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Gmail</h2>
                  <p className="text-slate-600">
                    Sync emails to track interactions with contacts
                  </p>
                </div>
              </div>

              {/* Status badge */}
              {!loading && (
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    gmailStatus?.connected
                      ? 'bg-green-100 text-green-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {gmailStatus?.connected ? 'Connected' : 'Not connected'}
                </div>
              )}
            </div>

            {loading ? (
              <div className="mt-6 animate-pulse space-y-4">
                <div className="h-10 bg-slate-100 rounded" />
                <div className="h-20 bg-slate-100 rounded" />
              </div>
            ) : gmailStatus?.connected ? (
              <>
                {/* Connected state */}
                <div className="mt-6 bg-slate-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-slate-500">Connected as</div>
                      <div className="font-medium text-slate-900">
                        {gmailStatus.email}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Last sync</div>
                      <div className="font-medium text-slate-900">
                        {formatDate(gmailStatus.lastSyncAt)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Total emails</div>
                      <div className="font-medium text-slate-900">
                        {gmailStatus.stats?.totalEmails.toLocaleString() || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Connected</div>
                      <div className="font-medium text-slate-900">
                        {formatDate(gmailStatus.connectedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                {gmailStatus.stats && gmailStatus.stats.totalEmails > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm font-medium">Inbound</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-900">
                        {gmailStatus.stats.inboundEmails.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-600 mb-1">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm font-medium">Outbound</span>
                      </div>
                      <div className="text-2xl font-bold text-green-900">
                        {gmailStatus.stats.outboundEmails.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-purple-600 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-sm font-medium">Linked People</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-900">
                        {gmailStatus.stats.linkedPersons.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-amber-600 mb-1">
                        <Building2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Linked Orgs</span>
                      </div>
                      <div className="text-2xl font-bold text-amber-900">
                        {gmailStatus.stats.linkedOrganizations.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Top contacts */}
                {gmailStatus.stats?.topContacts &&
                  gmailStatus.stats.topContacts.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">
                        Top Contacts
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {gmailStatus.stats.topContacts.map((contact) => (
                          <Link
                            key={contact.personId}
                            href={`/people/${contact.personId}`}
                            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 rounded-full px-3 py-1 text-sm transition-colors"
                          >
                            <span className="font-medium">{contact.name}</span>
                            <span className="text-slate-500">
                              {contact.emailCount} emails
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}
                    />
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 px-4 py-2 rounded-lg border border-red-200 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Not connected state */}
                <div className="mt-6">
                  <p className="text-slate-600 mb-4">
                    Connect your Gmail account to:
                  </p>
                  <ul className="space-y-2 text-sm text-slate-600 mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Track email interactions with contacts and companies
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Get AI-powered relationship summaries
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Extract action items from conversations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Calculate relationship strength scores
                    </li>
                  </ul>

                  <Link
                    href="/api/gmail/connect"
                    className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    Connect Gmail
                  </Link>

                  <p className="text-xs text-slate-500 mt-4">
                    We only request read access to your emails. Your data stays
                    secure and private.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Fireflies Integration Card */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Video className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Fireflies.ai</h2>
                  <p className="text-slate-600">
                    Sync meeting transcripts to track conversations
                  </p>
                </div>
              </div>

              {/* Status badge */}
              {!firefliesLoading && (
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    firefliesStatus?.connected
                      ? 'bg-green-100 text-green-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {firefliesStatus?.connected ? 'Connected' : 'Not connected'}
                </div>
              )}
            </div>

            {firefliesLoading ? (
              <div className="mt-6 animate-pulse space-y-4">
                <div className="h-10 bg-slate-100 rounded" />
                <div className="h-20 bg-slate-100 rounded" />
              </div>
            ) : firefliesStatus?.connected ? (
              <>
                {/* Connected state */}
                <div className="mt-6 bg-slate-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-slate-500">Connected as</div>
                      <div className="font-medium text-slate-900">
                        {firefliesStatus.connection?.email}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Last sync</div>
                      <div className="font-medium text-slate-900">
                        {formatDate(firefliesStatus.stats?.lastSyncAt || null)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Total meetings</div>
                      <div className="font-medium text-slate-900">
                        {firefliesStatus.stats?.totalMeetings.toLocaleString() || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Connected</div>
                      <div className="font-medium text-slate-900">
                        {formatDate(firefliesStatus.connection?.connectedAt || null)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                {firefliesStatus.stats && firefliesStatus.stats.totalMeetings > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-600 mb-1">
                        <Video className="w-4 h-4" />
                        <span className="text-sm font-medium">Meetings</span>
                      </div>
                      <div className="text-2xl font-bold text-green-900">
                        {firefliesStatus.stats.totalMeetings.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-purple-600 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-sm font-medium">Linked People</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-900">
                        {firefliesStatus.stats.linkedParticipants.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-amber-600 mb-1">
                        <Building2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Linked Orgs</span>
                      </div>
                      <div className="text-2xl font-bold text-amber-900">
                        {firefliesStatus.stats.linkedOrganizations.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleFirefliesSync}
                    disabled={firefliesSyncing}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${firefliesSyncing ? 'animate-spin' : ''}`}
                    />
                    {firefliesSyncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                  <button
                    onClick={handleFirefliesDisconnect}
                    disabled={firefliesDisconnecting}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 px-4 py-2 rounded-lg border border-red-200 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {firefliesDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Not connected state */}
                <div className="mt-6">
                  <p className="text-slate-600 mb-4">
                    Connect your Fireflies.ai account to:
                  </p>
                  <ul className="space-y-2 text-sm text-slate-600 mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Automatically sync meeting transcripts
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Link meetings to people and organizations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Track all your investor conversations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      View transcripts in the activity feed
                    </li>
                  </ul>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        <Key className="w-4 h-4 inline mr-1" />
                        Fireflies API Key
                      </label>
                      <input
                        type="password"
                        value={firefliesApiKey}
                        onChange={(e) => setFirefliesApiKey(e.target.value)}
                        placeholder="Enter your Fireflies API key"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <button
                      onClick={handleFirefliesConnect}
                      disabled={firefliesConnecting || !firefliesApiKey.trim()}
                      className="self-end flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {firefliesConnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Video className="w-4 h-4" />
                      )}
                      {firefliesConnecting ? 'Connecting...' : 'Connect'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 mt-4">
                    Get your API key from{' '}
                    <a
                      href="https://app.fireflies.ai/api/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:underline"
                    >
                      Fireflies Settings
                    </a>
                    . We only read your meeting transcripts.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Other integrations placeholder */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Coming Soon
          </h3>
          <p className="text-slate-600 mb-4">
            More integrations are on the way:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: 'LinkedIn', desc: 'Profile enrichment' },
              { name: 'Crunchbase', desc: 'Company data' },
              { name: 'AngelList', desc: 'Syndicate data' },
            ].map((integration) => (
              <div
                key={integration.name}
                className="bg-slate-50 rounded-lg p-4 opacity-60"
              >
                <div className="font-medium text-slate-700">
                  {integration.name}
                </div>
                <div className="text-sm text-slate-500">{integration.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/4" />
            <div className="h-64 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    }>
      <IntegrationsContent />
    </Suspense>
  );
}
