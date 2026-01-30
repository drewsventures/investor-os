'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  TrendingUp,
  Briefcase,
  Wallet,
  Brain,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  PiggyBank,
  Handshake,
  Rocket,
  Store,
  Target,
  FolderKanban,
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  name: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  items: NavItem[];
  subSections?: {
    name: string;
    items: NavItem[];
  }[];
}

// RBV Hub navigation
const rbvSection: NavSection = {
  name: 'RBV',
  icon: Briefcase,
  defaultOpen: true,
  items: [
    { name: 'Dashboard', href: '/rbv', icon: LayoutDashboard },
  ],
  subSections: [
    {
      name: 'Fund I',
      items: [
        { name: 'Portfolio', href: '/rbv/fund-i/portfolio', icon: Building2 },
        { name: 'LPs', href: '/rbv/fund-i/lps', icon: PiggyBank },
      ],
    },
  ],
};

const rbvItems: NavItem[] = [
  { name: 'Fund II Fundraise', href: '/rbv/fund-ii', icon: Target },
  { name: 'Syndicates', href: '/rbv/syndicates', icon: Users },
  { name: 'Deal Pipeline', href: '/rbv/deals', icon: TrendingUp },
  { name: 'Co-Investors', href: '/rbv/co-investors', icon: Handshake },
];

// Denarii Hub navigation
const denariiSection: NavSection = {
  name: 'Denarii',
  icon: Store,
  defaultOpen: false,
  items: [
    { name: 'Dashboard', href: '/denarii', icon: LayoutDashboard },
    { name: 'Clients', href: '/denarii/clients', icon: Building2 },
    { name: 'Sales Pipeline', href: '/denarii/sales', icon: TrendingUp },
    { name: 'Partner Vendors', href: '/denarii/vendors', icon: Handshake },
    { name: 'Accelerators', href: '/denarii/accelerators', icon: Rocket },
  ],
};

// Global navigation
const globalItems: NavItem[] = [
  { name: 'People', href: '/people', icon: Users },
  { name: 'Organizations', href: '/organizations', icon: Building2 },
  { name: 'AI Brain', href: '/brain', icon: Brain },
  { name: 'Settings', href: '/settings/integrations', icon: Settings },
];

export default function HubSidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [rbvOpen, setRbvOpen] = useState(true);
  const [denariiOpen, setDenariiOpen] = useState(false);
  const [fundIOpen, setFundIOpen] = useState(true);

  const isActive = (href: string) => {
    if (href === '/rbv' || href === '/denarii') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const NavLink = ({ item, indent = false }: { item: NavItem; indent?: boolean }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          indent && !collapsed ? 'ml-4' : ''
        } ${
          active
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
        title={collapsed ? item.name : undefined}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span className="font-medium text-sm">{item.name}</span>}
      </Link>
    );
  };

  const SectionHeader = ({
    name,
    icon: Icon,
    isOpen,
    onToggle,
  }: {
    name: string;
    icon: React.ElementType;
    isOpen: boolean;
    onToggle: () => void;
  }) => (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white transition-colors"
      title={collapsed ? name : undefined}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && (
        <>
          <span className="font-semibold text-sm uppercase tracking-wide flex-1 text-left">
            {name}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </>
      )}
    </button>
  );

  const SubSectionHeader = ({
    name,
    isOpen,
    onToggle,
  }: {
    name: string;
    isOpen: boolean;
    onToggle: () => void;
  }) => (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-3 py-1.5 ml-4 text-slate-500 hover:text-slate-300 transition-colors text-sm"
    >
      {!collapsed && (
        <>
          <ChevronDown
            className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
          <span className="font-medium">{name}</span>
        </>
      )}
    </button>
  );

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-slate-900 text-white transition-all duration-300 z-50 flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-slate-700">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-lg">
            IO
          </div>
          {!collapsed && (
            <div>
              <div className="font-bold text-lg">Investor OS</div>
              <div className="text-xs text-slate-400">Red Beard Ventures</div>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* RBV Hub */}
        <div className="mb-2">
          <SectionHeader
            name="RBV"
            icon={Briefcase}
            isOpen={rbvOpen}
            onToggle={() => setRbvOpen(!rbvOpen)}
          />
          {(rbvOpen || collapsed) && (
            <div className="space-y-0.5 mt-1">
              {/* RBV Dashboard */}
              <NavLink item={{ name: 'Dashboard', href: '/rbv', icon: LayoutDashboard }} indent />

              {/* Fund I Section */}
              {!collapsed && (
                <SubSectionHeader
                  name="Fund I"
                  isOpen={fundIOpen}
                  onToggle={() => setFundIOpen(!fundIOpen)}
                />
              )}
              {(fundIOpen || collapsed) && (
                <div className="space-y-0.5">
                  <NavLink
                    item={{ name: 'Portfolio', href: '/rbv/fund-i/portfolio', icon: Building2 }}
                    indent
                  />
                  <NavLink
                    item={{ name: 'LPs', href: '/rbv/fund-i/lps', icon: PiggyBank }}
                    indent
                  />
                </div>
              )}

              {/* Other RBV items */}
              {rbvItems.map((item) => (
                <NavLink key={item.href} item={item} indent />
              ))}
            </div>
          )}
        </div>

        {/* Denarii Hub */}
        <div className="mb-2">
          <SectionHeader
            name="Denarii"
            icon={Store}
            isOpen={denariiOpen}
            onToggle={() => setDenariiOpen(!denariiOpen)}
          />
          {(denariiOpen || collapsed) && (
            <div className="space-y-0.5 mt-1">
              {denariiSection.items.map((item) => (
                <NavLink key={item.href} item={item} indent />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700 my-3" />

        {/* Global Items */}
        <div className="space-y-0.5">
          {globalItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Toggle Button */}
      <div className="p-3 border-t border-slate-700">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
