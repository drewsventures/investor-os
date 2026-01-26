'use client';

/**
 * Team Management Page
 * Manage team members (Owner/Admin only)
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  ArrowLeft,
  Users,
  Shield,
  Mail,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  lastActiveAt: string | null;
  createdAt: string;
}

export default function TeamManagementPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/team/members');
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'ADMIN' | 'MEMBER') => {
    try {
      const response = await fetch('/api/team/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Role updated successfully' });
        fetchTeamMembers();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to update role' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update role' });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/team/members?memberId=${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Member removed successfully' });
        fetchTeamMembers();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to remove member' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to remove member' });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const roleColors = {
    OWNER: 'bg-purple-100 text-purple-800',
    ADMIN: 'bg-blue-100 text-blue-800',
    MEMBER: 'bg-slate-100 text-slate-800',
  };

  // Only Owner and Admin can access this page
  if (user && user.role !== 'OWNER' && user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">Access Denied</h2>
          <p className="text-slate-600 mt-2">
            You don&apos;t have permission to view this page.
          </p>
          <Link
            href="/settings/profile"
            className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Profile Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/settings/integrations"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-600 mt-1">Manage team members and roles</p>
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
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="ml-auto opacity-60 hover:opacity-100"
            >
              &times;
            </button>
          </div>
        )}

        {/* Team Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Red Beard Ventures</h2>
              <p className="text-slate-500">
                {members.length} team member{members.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              <span className="font-medium">Allowed domains:</span>{' '}
              @denariilabs.xyz, @redbeard.ventures
            </p>
          </div>
        </div>

        {/* Members List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Team Members</h3>
          </div>

          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No team members found
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 flex items-center gap-4 hover:bg-slate-50"
                >
                  {/* Avatar */}
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.fullName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                      {member.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 truncate">
                        {member.fullName}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          roleColors[member.role]
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {member.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3" />
                        {member.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last active: {formatDate(member.lastActiveAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions (only for non-owners) */}
                  {member.role !== 'OWNER' && user?.role === 'OWNER' && (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(member.id, e.target.value as 'ADMIN' | 'MEMBER')
                        }
                        className="text-sm border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Note about invites */}
        <div className="mt-6 bg-slate-100 rounded-lg p-4">
          <h4 className="font-medium text-slate-900 mb-2">Adding New Members</h4>
          <p className="text-sm text-slate-600">
            Team members can sign up directly using their @denariilabs.xyz or @redbeard.ventures
            email address. They will automatically be added to the team with Member role.
          </p>
        </div>
      </div>
    </div>
  );
}
