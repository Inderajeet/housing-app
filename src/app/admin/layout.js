'use client';

import React, { useState, Suspense } from 'react';
import Sidebar from '../../components/admin/Sidebar';
import NotificationBell from '../../components/admin/NotificationBell';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  if (pathname?.includes('/editor/')) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Suspense fallback={null}>
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(prev => !prev)} />
      </Suspense>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <NotificationBell className="fixed top-6 right-6 z-40" />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
