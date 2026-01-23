'use client';

/**
 * People List Page
 * View and manage all people in the network (founders, LPs, advisors, contacts)
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Linkedin,
  Building2,
  Calendar
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  organizationType: string;
}

interface Person {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  linkedInUrl: string | null;
  lastContactedAt: Date | null;
  organizations: Organization[];
  conversationCount: number;
  taskCount: number;
  createdAt: Date;
}

interface PeopleSummary {
  totalLPs: number;
  contactedLast30Days: number;
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [summary, setSummary] = useState<PeopleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'lastContact' | 'recent'>('name');

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/investor-os/people');
      const data = await response.json();
      setPeople(data.people || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Failed to fetch people:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort
  const filteredPeople = people
    .filter(person => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        person.fullName.toLowerCase().includes(query) ||
        person.email?.toLowerCase().includes(query) ||
        person.organizations.some(org => org.name.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.fullName.localeCompare(b.fullName);
      } else if (sortBy === 'lastContact') {
        if (!a.lastContactedAt) return 1;
        if (!b.lastContactedAt) return -1;
        return new Date(b.lastContactedAt).getTime() - new Date(a.lastContactedAt).getTime();
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-blue-600" />
              People
            </h1>
            <p className="text-gray-600 mt-1">
              Your network of founders, LPs, advisors, and contacts
            </p>
          </div>
          <Link
            href="/investor-os/people/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Person
          </Link>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total People</div>
              <div className="text-2xl font-bold text-gray-900">{people.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">LPs</div>
              <div className="text-2xl font-bold text-green-600">{summary.totalLPs}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Contacted (30 days)</div>
              <div className="text-2xl font-bold text-blue-600">{summary.contactedLast30Days}</div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Name</option>
            <option value="lastContact">Last Contact</option>
            <option value="recent">Recently Added</option>
          </select>
        </div>
      </div>

      {/* People List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading people...</p>
        </div>
      ) : filteredPeople.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No people found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? 'Try adjusting your search'
              : 'Get started by adding your first contact'}
          </p>
          <Link
            href="/investor-os/people/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Person
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
                  Contact Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organizations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Contact
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPeople.map((person) => (
                <tr key={person.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/investor-os/people/${person.id}`} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {person.firstName[0]}{person.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {person.fullName}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600 space-y-1">
                      {person.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <a href={`mailto:${person.email}`} className="hover:text-blue-600">
                            {person.email}
                          </a>
                        </div>
                      )}
                      {person.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {person.phone}
                        </div>
                      )}
                      {person.linkedInUrl && (
                        <div className="flex items-center gap-1">
                          <Linkedin className="w-3 h-3" />
                          <a
                            href={person.linkedInUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600"
                          >
                            LinkedIn
                          </a>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 space-y-1">
                      {person.organizations.slice(0, 3).map((org) => (
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
                      {person.organizations.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{person.organizations.length - 3} more
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs text-gray-500">
                      {person.conversationCount > 0 && (
                        <div>{person.conversationCount} conversations</div>
                      )}
                      {person.taskCount > 0 && <div>{person.taskCount} tasks</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {person.lastContactedAt ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(person.lastContactedAt).toLocaleDateString()}
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
      {!loading && filteredPeople.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {filteredPeople.length} of {people.length} people
        </div>
      )}
    </div>
  );
}
