'use client';

/**
 * Person Detail Page
 * Comprehensive view of a single person with all related data
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Building2,
  MessageSquare,
  CheckSquare,
  ArrowLeft,
  Mail,
  Phone,
  Linkedin,
  Calendar,
  DollarSign
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  organizationType: string;
  role: string;
}

interface Conversation {
  id: string;
  conversationDate: Date;
  medium: string;
  title: string;
  summary: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
}

interface LPCommitment {
  id: string;
  fundName: string;
  commitmentAmount: number;
  calledAmount: number;
  returnedAmount: number;
  isActive: boolean;
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
  conversations: Conversation[];
  tasks: Task[];
  lpCommitments: LPCommitment[];
  factsByType: Record<string, any[]>;
  relationships: any[];
}

export default function PersonDetailPage({ params }: { params: { id: string } }) {
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'organizations' | 'conversations' | 'tasks' | 'lp'>('overview');

  useEffect(() => {
    fetchPerson();
  }, [params.id]);

  const fetchPerson = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/investor-os/people/${params.id}`);
      const data = await response.json();
      setPerson(data);
    } catch (error) {
      console.error('Failed to fetch person:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mt-20"></div>
          <p className="text-center mt-4 text-gray-600">Loading person...</p>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Person not found</h3>
            <Link href="/investor-os/people" className="text-blue-600 hover:underline">
              Back to people
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/investor-os/people"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to People
          </Link>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-2xl">
                    {person.firstName[0]}{person.lastName[0]}
                  </span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{person.fullName}</h1>
                  <div className="flex flex-col gap-2 mt-2">
                    {person.email && (
                      <a
                        href={`mailto:${person.email}`}
                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
                      >
                        <Mail className="w-4 h-4" />
                        {person.email}
                      </a>
                    )}
                    {person.phone && (
                      <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        {person.phone}
                      </div>
                    )}
                    {person.linkedInUrl && (
                      <a
                        href={person.linkedInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <Linkedin className="w-4 h-4" />
                        LinkedIn Profile
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Ask AI Brain
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div>
                <div className="text-sm text-gray-600">Organizations</div>
                <div className="text-2xl font-bold text-gray-900">{person.organizations.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Conversations</div>
                <div className="text-2xl font-bold text-gray-900">{person.conversations.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Open Tasks</div>
                <div className="text-2xl font-bold text-gray-900">{person.tasks.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Last Contact</div>
                <div className="text-lg font-bold text-gray-900">
                  {person.lastContactedAt
                    ? new Date(person.lastContactedAt).toLocaleDateString()
                    : 'Never'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'overview', label: 'Overview', icon: Users },
                { id: 'organizations', label: 'Organizations', icon: Building2, count: person.organizations.length },
                { id: 'conversations', label: 'Conversations', icon: MessageSquare, count: person.conversations.length },
                { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: person.tasks.length },
                { id: 'lp', label: 'LP Commitments', icon: DollarSign, count: person.lpCommitments.length }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Organizations */}
                {person.organizations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Organizations</h3>
                    <div className="space-y-3">
                      {person.organizations.map((org) => (
                        <Link
                          key={org.id}
                          href={`/investor-os/organizations/${org.id}`}
                          className="block bg-gray-50 rounded-lg p-4 hover:bg-gray-100"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-gray-900">{org.name}</div>
                              <div className="text-sm text-gray-600">{org.role}</div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              org.organizationType === 'PORTFOLIO' ? 'bg-blue-100 text-blue-800' :
                              org.organizationType === 'LP' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {org.organizationType}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Conversations */}
                {person.conversations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Conversations</h3>
                    <div className="space-y-3">
                      {person.conversations.slice(0, 5).map((conv) => (
                        <div key={conv.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{conv.title}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {new Date(conv.conversationDate).toLocaleDateString()} •{' '}
                                <span className="px-2 py-0.5 bg-white rounded text-xs">{conv.medium}</span>
                              </div>
                              {conv.summary && (
                                <div className="text-sm text-gray-700 mt-2">{conv.summary}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* LP Commitments */}
                {person.lpCommitments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">LP Commitments</h3>
                    <div className="space-y-3">
                      {person.lpCommitments.map((lp) => (
                        <div key={lp.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-gray-900">{lp.fundName}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                Committed: ${(lp.commitmentAmount / 1000000).toFixed(2)}M
                              </div>
                              <div className="text-sm text-gray-600">
                                Called: ${(lp.calledAmount / 1000000).toFixed(2)}M •{' '}
                                Returned: ${(lp.returnedAmount / 1000000).toFixed(2)}M
                              </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              lp.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {lp.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Organizations Tab */}
            {activeTab === 'organizations' && (
              <div>
                {person.organizations.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600">No organization affiliations</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {person.organizations.map((org) => (
                      <Link
                        key={org.id}
                        href={`/investor-os/organizations/${org.id}`}
                        className="block bg-gray-50 rounded-lg p-4 hover:bg-gray-100"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{org.name}</div>
                            <div className="text-sm text-gray-600">{org.role}</div>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            org.organizationType === 'PORTFOLIO' ? 'bg-blue-100 text-blue-800' :
                            org.organizationType === 'LP' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {org.organizationType}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conversations Tab */}
            {activeTab === 'conversations' && (
              <div>
                {person.conversations.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600">No conversations logged</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {person.conversations.map((conv) => (
                      <div key={conv.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{conv.title}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {new Date(conv.conversationDate).toLocaleDateString()} •{' '}
                              <span className="px-2 py-0.5 bg-white rounded text-xs">{conv.medium}</span>
                            </div>
                            {conv.summary && (
                              <div className="text-sm text-gray-700 mt-2">{conv.summary}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div>
                {person.tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600">No open tasks</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {person.tasks.map((task) => (
                      <div key={task.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                task.priority === 'URGENT' ? 'bg-red-500' :
                                task.priority === 'HIGH' ? 'bg-orange-500' :
                                task.priority === 'MEDIUM' ? 'bg-yellow-500' :
                                'bg-gray-400'
                              }`}></span>
                              <div className="font-semibold text-gray-900">{task.title}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              task.status === 'TODO' ? 'bg-gray-100 text-gray-800' :
                              task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                              task.status === 'BLOCKED' ? 'bg-red-100 text-red-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </span>
                            {task.dueDate && (
                              <div className="text-xs text-gray-500 mt-1">
                                Due {new Date(task.dueDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* LP Tab */}
            {activeTab === 'lp' && (
              <div>
                {person.lpCommitments.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600">No LP commitments</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {person.lpCommitments.map((lp) => (
                      <div key={lp.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">{lp.fundName}</h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            lp.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {lp.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Commitment</div>
                            <div className="font-semibold text-gray-900">
                              ${(lp.commitmentAmount / 1000000).toFixed(2)}M
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Called</div>
                            <div className="font-semibold text-gray-900">
                              ${(lp.calledAmount / 1000000).toFixed(2)}M
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Returned</div>
                            <div className="font-semibold text-gray-900">
                              ${(lp.returnedAmount / 1000000).toFixed(2)}M
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
