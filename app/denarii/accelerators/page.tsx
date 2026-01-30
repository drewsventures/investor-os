'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Rocket, Plus, Search, Building2, Users, Calendar } from 'lucide-react';

interface AcceleratorProgram {
  id: string;
  name: string;
  description?: string;
  sponsorCount: number;
  cohortCompanyCount: number;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'completed' | 'upcoming';
}

export default function AcceleratorsPage() {
  const [programs, setPrograms] = useState<AcceleratorProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // TODO: Implement accelerator programs API
    setLoading(false);
  }, []);

  const filteredPrograms = programs.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accelerators</h1>
          <p className="text-gray-500 mt-1">Programs, sponsors, and cohort companies</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
          <Plus className="w-4 h-4" />
          New Program
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search programs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      </div>

      {/* Programs Grid */}
      {filteredPrograms.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Rocket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No accelerator programs yet</h3>
          <p className="text-gray-500 mb-4">
            Create accelerator programs to track sponsors, cohorts, and portfolio companies.
          </p>
          <button className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            Create First Program
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPrograms.map((program) => (
            <Link
              key={program.id}
              href={`/denarii/accelerators/${program.id}`}
              className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                      {program.name}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        program.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : program.status === 'upcoming'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {program.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{program.description}</p>
              )}

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
                    <Building2 className="w-3 h-3" />
                    Sponsors
                  </div>
                  <div className="font-semibold text-gray-900">{program.sponsorCount}</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
                    <Users className="w-3 h-3" />
                    Companies
                  </div>
                  <div className="font-semibold text-gray-900">{program.cohortCompanyCount}</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
                    <Calendar className="w-3 h-3" />
                    Duration
                  </div>
                  <div className="font-semibold text-gray-900 text-sm">
                    {program.startDate
                      ? new Date(program.startDate).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'TBD'}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
