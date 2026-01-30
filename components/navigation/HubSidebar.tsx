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
  CircleDollarSign,
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

  // Check if any Fund I route is active
  const isFundIActive = pathname.startsWith('/rbv/fund-i') || pathname === '/fund';

  const NavLink = ({
    item,
    indentLevel = 0
  }: {
    item: NavItem;
    indentLevel?: number;
  }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const marginLeft = collapsed ? 0 : indentLevel * 12;

    return (
      <Link
        href={item.href}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 ${
          active
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
        }`}
        style={{ marginLeft: `${marginLeft}px` }}
        title={collapsed ? item.name : undefined}
      >
        <Icon className={`flex-shrink-0 ${active ? 'w-[18px] h-[18px]' : 'w-[18px] h-[18px]'}`} />
        {!collapsed && <span className="font-medium text-[13px]">{item.name}</span>}
      </Link>
    );
  };

  // Hub section header (RBV, Denarii)
  const HubHeader = ({
    name,
    icon: Icon,
    isOpen,
    onToggle,
    color = 'text-slate-400',
  }: {
    name: string;
    icon: React.ElementType;
    isOpen: boolean;
    onToggle: () => void;
    color?: string;
  }) => (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 ${color} hover:text-white transition-colors rounded-lg hover:bg-slate-800/50`}
      title={collapsed ? name : undefined}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && (
        <>
          <span className="font-bold text-xs uppercase tracking-wider flex-1 text-left">
            {name}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
          />
        </>
      )}
    </button>
  );

  // Subsection header with visual grouping (Fund I, etc.)
  const SubsectionGroup = ({
    name,
    icon: Icon,
    isOpen,
    onToggle,
    isActive,
    children,
  }: {
    name: string;
    icon: React.ElementType;
    isOpen: boolean;
    onToggle: () => void;
    isActive: boolean;
    children: React.ReactNode;
  }) => (
    <div className={`mx-2 my-1 rounded-lg transition-colors ${isActive ? 'bg-slate-800/60' : 'bg-slate-800/30'}`}>
      {/* Subsection Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-slate-400 hover:text-slate-200 transition-colors"
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="font-semibold text-xs uppercase tracking-wide flex-1 text-left">
              {name}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
            />
          </>
        )}
      </button>

      {/* Subsection Items */}
      {isOpen && !collapsed && (
        <div className="pb-2 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );

  // Nested nav item (inside subsections like Fund I)
  const NestedNavLink = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <Link
        href={item.href}
        className={`flex items-center gap-2 mx-2 px-2.5 py-1.5 rounded-md transition-all duration-150 ${
          active
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
        }`}
        title={collapsed ? item.name : undefined}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span className="text-[13px]">{item.name}</span>}
      </Link>
    );
  };

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-slate-900 text-white transition-all duration-300 z-50 flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-slate-700/50">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg">
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
      <nav className="flex-1 py-3 overflow-y-auto">
        {/* RBV Hub */}
        <div className="px-2 mb-3">
          <HubHeader
            name="RBV"
            icon={Briefcase}
            isOpen={rbvOpen}
            onToggle={() => setRbvOpen(!rbvOpen)}
            color="text-purple-400"
          />

          {(rbvOpen || collapsed) && (
            <div className="mt-1 space-y-0.5">
              {/* RBV Dashboard */}
              <div className="px-1">
                <NavLink
                  item={{ name: 'Dashboard', href: '/rbv', icon: LayoutDashboard }}
                  indentLevel={1}
                />
              </div>

              {/* Fund I Section - Visually Grouped */}
              {!collapsed ? (
                <SubsectionGroup
                  name="Fund I"
                  icon={Wallet}
                  isOpen={fundIOpen}
                  onToggle={() => setFundIOpen(!fundIOpen)}
                  isActive={isFundIActive}
                >
                  <NestedNavLink item={{ name: 'Portfolio', href: '/rbv/fund-i/portfolio', icon: Building2 }} />
                  <NestedNavLink item={{ name: 'LPs', href: '/rbv/fund-i/lps', icon: PiggyBank }} />
                </SubsectionGroup>
              ) : (
                <div className="px-1 space-y-0.5">
                  <NavLink item={{ name: 'Portfolio', href: '/rbv/fund-i/portfolio', icon: Building2 }} />
                  <NavLink item={{ name: 'LPs', href: '/rbv/fund-i/lps', icon: PiggyBank }} />
                </div>
              )}

              {/* Other RBV items */}
              <div className="px-1 space-y-0.5">
                <NavLink item={{ name: 'Fund II Fundraise', href: '/rbv/fund-ii', icon: Target }} indentLevel={1} />
                <NavLink item={{ name: 'Syndicates', href: '/rbv/syndicates', icon: Users }} indentLevel={1} />
                <NavLink item={{ name: 'Deal Pipeline', href: '/rbv/deals', icon: TrendingUp }} indentLevel={1} />
                <NavLink item={{ name: 'Co-Investors', href: '/rbv/co-investors', icon: Handshake }} indentLevel={1} />
              </div>
            </div>
          )}
        </div>

        {/* Denarii Hub */}
        <div className="px-2 mb-3">
          <HubHeader
            name="Denarii"
            icon={Store}
            isOpen={denariiOpen}
            onToggle={() => setDenariiOpen(!denariiOpen)}
            color="text-emerald-400"
          />

          {(denariiOpen || collapsed) && (
            <div className="mt-1 px-1 space-y-0.5">
              <NavLink item={{ name: 'Dashboard', href: '/denarii', icon: LayoutDashboard }} indentLevel={1} />
              <NavLink item={{ name: 'Clients', href: '/denarii/clients', icon: Building2 }} indentLevel={1} />
              <NavLink item={{ name: 'Sales Pipeline', href: '/denarii/sales', icon: TrendingUp }} indentLevel={1} />
              <NavLink item={{ name: 'Partner Vendors', href: '/denarii/vendors', icon: Handshake }} indentLevel={1} />
              <NavLink item={{ name: 'Accelerators', href: '/denarii/accelerators', icon: Rocket }} indentLevel={1} />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 my-3 border-t border-slate-700/50" />

        {/* Global Section Label */}
        {!collapsed && (
          <div className="px-5 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Global
            </span>
          </div>
        )}

        {/* Global Items */}
        <div className="px-3 space-y-0.5">
          <NavLink item={{ name: 'People', href: '/people', icon: Users }} />
          <NavLink item={{ name: 'Organizations', href: '/organizations', icon: Building2 }} />
          <NavLink item={{ name: 'AI Brain', href: '/brain', icon: Brain }} />
          <NavLink item={{ name: 'Settings', href: '/settings/integrations', icon: Settings }} />
        </div>
      </nav>

      {/* Toggle Button */}
      <div className="p-3 border-t border-slate-700/50">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
