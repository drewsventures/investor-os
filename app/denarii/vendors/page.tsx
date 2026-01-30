'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Handshake, Plus, Search, ExternalLink, Star } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  domain?: string;
  description?: string;
  logoUrl?: string;
  category?: string;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/organizations?hubType=denarii&clientType=vendor');
      if (res.ok) {
        const data = await res.json();
        setVendors(data.organizations || []);
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Partner Vendors</h1>
          <p className="text-gray-500 mt-1">Service partners and preferred vendors</p>
        </div>
        <Link
          href="/organizations/new?hubType=denarii&clientType=vendor"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Vendor
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      </div>

      {/* Vendors Grid */}
      {filteredVendors.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Handshake className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors yet</h3>
          <p className="text-gray-500 mb-4">
            Add partner vendors to track your service relationships.
          </p>
          <Link
            href="/organizations/new?hubType=denarii&clientType=vendor"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add First Vendor
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <Link
              key={vendor.id}
              href={`/organizations/${vendor.id}`}
              className="group bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all"
            >
              <div className="flex items-start gap-3">
                {vendor.logoUrl ? (
                  <img
                    src={vendor.logoUrl}
                    alt={vendor.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Handshake className="w-6 h-6 text-purple-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors truncate">
                    {vendor.name}
                  </h3>
                  {vendor.category && (
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded mt-1 inline-block">
                      {vendor.category}
                    </span>
                  )}
                  {vendor.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{vendor.description}</p>
                  )}
                </div>
              </div>
              {vendor.domain && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1 text-sm text-gray-500">
                  <ExternalLink className="w-3 h-3" />
                  {vendor.domain}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
