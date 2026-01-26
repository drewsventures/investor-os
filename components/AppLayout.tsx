'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { AuthProvider } from './auth/AuthProvider';
import UserMenu from './auth/UserMenu';

interface AppLayoutProps {
  children: React.ReactNode;
}

// Pages that don't show the sidebar/navbar
const authPages = ['/login'];

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Don't show layout on auth pages
  if (authPages.includes(pathname)) {
    return (
      <AuthProvider>
        {children}
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50">
        {/* Top bar with user menu */}
        <header className={`fixed top-0 right-0 z-40 h-14 bg-white border-b border-slate-200 flex items-center justify-end px-6 transition-all duration-300 ${
          collapsed ? 'left-16' : 'left-64'
        }`}>
          <UserMenu />
        </header>

        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <main
          className={`transition-all duration-300 pt-14 ${
            collapsed ? 'ml-16' : 'ml-64'
          }`}
        >
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
