'use client';

/**
 * Network Management Page
 * View and manage team's network of contacts with filtering and relationship tracking
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Network,
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Twitter,
  Building2,
  Calendar,
  Users,
  TrendingUp
} from 'lucide-react';
import RelationshipStrengthIndicator from '@/components/investor-os/RelationshipStrengthIndicator';

interface Organization {
  id: string;
  name: string;
  organizationType: string;
}

interface Contact {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  telegramHandle: string | null;
  twitterHandle: string | null;
  city: string | null;
  country: string | null;
  region: string | null;
  currentOwner: string | null;
  primaryPOC: string | null;
  lastContactedAt: Date | null;
  organizations: Organization[];
  conversationCount: number;
  taskCount: number;
  relationshipStrength: number | null;
}

interface NetworkSummary {
  totalContacts: number;
  byGeography: { name: string; count: number }[];
  byOwner: { ownerId: string; ownerName: string; count: number }[];
  avgRelationshipStrength: number;
  withTelegram: number;
  withTwitter: number;
}

interface TeamCoverage {
  teamMemberId: string;
  teamMemberName: string;
  contactCount: number;
  strongConnections: number;
}

export default function NetworkPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [summary, setSummary] = useState<NetworkSummary | null>(null);
  const [teamCoverage, setTeamCoverage] = useState<TeamCoverage[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [teamMemberFilter, setTeamMemberFilter] = useState('');
  const [minStrengthFilter, setMinStrengthFilter] = useState('');
  const [hasEmail, setHasEmail] = useState(false);
  const [hasTelegram, setHasTelegram] = useState(false);
  const [hasTwitter, setHasTwitter] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'lastContact' | 'strength'>('name');

  useEffect(() => {
    fetchNetwork();
  }, []);

  const fetchNetwork = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (teamMemberFilter) params.append('teamMemberId', teamMemberFilter);
      if (countryFilter) params.append('country', countryFilter);
      if (minStrengthFilter) params.append('minStrength', minStrengthFilter);
      if (hasEmail) params.append('email', 'true');
      if (hasTelegram) params.append('telegram', 'true');
      if (hasTwitter) params.append('twitter', 'true');
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/investor-os/network?${params.toString()}`);
      const data = await response.json();

      setContacts(data.contacts || []);
      setSummary(data.summary || null);
      setTeamCoverage(data.teamCoverage || []);
    } catch (error) {
      console.error('Failed to fetch network:', error);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering (for search)
  const filteredContacts = contacts
    .filter(contact => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        contact.fullName.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.organizations.some(org => org.name.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.fullName.localeCompare(b.fullName);
      } else if (sortBy === 'lastContact') {
        if (!a.lastContactedAt) return 1;
        if (!b.lastContactedAt) return -1;
        return new Date(b.lastContactedAt).getTime() - new Date(a.lastContactedAt).getTime();
      } else if (sortBy === 'strength') {
        if (a.relationshipStrength === null) return 1;
        if (b.relationshipStrength === null) return -1;
        return b.relationshipStrength - a.relationshipStrength;
      }
      return 0;
    });

  // Get unique countries for filter
  const uniqueCountries = Array.from(
    new Set(contacts.map(c => c.country).filter(Boolean))
  ).sort();

  const handleApplyFilters = () => {
    fetchNetwork();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCountryFilter('');
    setTeamMemberFilter('');
    setMinStrengthFilter('');
    setHasEmail(false);
    setHasTelegram(false);
    setHasTwitter(false);
    fetchNetwork();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Network className="w-8 h-8 text-blue-600" />
              Network
            </h1>
            <p className="text-gray-600 mt-1">
              Your team&apos;s network of contacts and connections
            </p>
          </div>
          <Link
            href="/investor-os/people/new"
            className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </Link>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Contacts</div>
              <div className="text-2xl font-bold text-gray-900">{summary.totalContacts}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Team Members</div>
              <div className="text-2xl font-bold text-blue-600">{teamCoverage.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Avg Strength
              </div>
              <div className="text-2xl font-bold text-green-600">
                {summary.avgRelationshipStrength.toFixed(2)}
              </div>
              <div className="mt-2">
                <RelationshipStrengthIndicator
                  strength={summary.avgRelationshipStrength}
                  showLabel={false}
                  size="sm"
                />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">With Contact Methods</div>
              <div className="text-sm text-gray-500 mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-3 h-3" />
                  Telegram: {summary.withTelegram}
                </div>
                <div className="flex items-center gap-2">
                  <Twitter className="w-3 h-3" />
                  Twitter: {summary.withTwitter}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="space-y-4">
          {/* Row 1: Search */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, organization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Filters */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Geography */}
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Countries</option>
              {uniqueCountries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>

            {/* Team Member */}
            <select
              value={teamMemberFilter}
              onChange={(e) => setTeamMemberFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Team</option>
              {teamCoverage.map(member => (
                <option key={member.teamMemberId} value={member.teamMemberId}>
                  {member.teamMemberName}
                </option>
              ))}
            </select>

            {/* Relationship Strength */}
            <select
              value={minStrengthFilter}
              onChange={(e) => setMinStrengthFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Strengths</option>
              <option value="0.7">Strong (&gt; 0.7)</option>
              <option value="0.3">Medium (&gt; 0.3)</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Name</option>
              <option value="lastContact">Last Contact</option>
              <option value="strength">Strength</option>
            </select>
          </div>

          {/* Row 3: Contact Methods */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasEmail}
                onChange={(e) => setHasEmail(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Has Email</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasTelegram}
                onChange={(e) => setHasTelegram(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <MessageCircle className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Has Telegram</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasTwitter}
                onChange={(e) => setHasTwitter(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Twitter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Has Twitter</span>
            </label>
          </div>

          {/* Apply/Clear Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyFilters}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Contacts Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading network...</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Network className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No contacts found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first contact'}
          </p>
          <Link
            href="/investor-os/people/new"
            className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organizations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Strength
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Contact
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/investor-os/people/${contact.id}`} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {contact.firstName[0]}{contact.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {contact.fullName}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contact.city || contact.country ? (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="w-3 h-3" />
                        {contact.city && contact.country
                          ? `${contact.city}, ${contact.country}`
                          : contact.city || contact.country}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {contact.email && <Mail className="w-4 h-4 text-blue-500" title="Email" />}
                      {contact.phone && <Phone className="w-4 h-4 text-green-500" title="Phone" />}
                      {contact.telegramHandle && (
                        <MessageCircle className="w-4 h-4 text-teal-500" title="Telegram" />
                      )}
                      {contact.twitterHandle && (
                        <Twitter className="w-4 h-4 text-sky-500" title="Twitter" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 space-y-1">
                      {contact.organizations.slice(0, 2).map((org) => (
                        <div key={org.id} className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <Link
                            href={`/investor-os/organizations/${org.id}`}
                            className="hover:text-blue-600"
                          >
                            {org.name}
                          </Link>
                        </div>
                      ))}
                      {contact.organizations.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{contact.organizations.length - 2} more
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-32">
                      <RelationshipStrengthIndicator
                        strength={contact.relationshipStrength}
                        size="sm"
                        showLabel={true}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.lastContactedAt ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(contact.lastContactedAt).toLocaleDateString()}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Results count */}
      {!loading && filteredContacts.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {filteredContacts.length} of {contacts.length} contacts
        </div>
      )}
    </div>
  );
}
