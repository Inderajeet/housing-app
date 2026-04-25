'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import MenuBar from '../components/MenuBar';
import PostPropertyFlow from '../components/PostPropertyFlow';
import AnalyticsTracker from '../components/AnalyticsTracker';
import { useAppContext } from './AppContext';

function MenuBarFallback() {
  return <div className="menu-bar-container" />;
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  const {
    menuPremiumProperties,
    showPostModal,
    postModalTransactionType,
    handlePostPropertySuccess,
    setShowPostModal,
  } = useAppContext();

  return (
    <>
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
      {!isAdmin && (
        <Suspense fallback={<MenuBarFallback />}>
          <MenuBar menuPremiumProperties={menuPremiumProperties} />
        </Suspense>
      )}
      {children}
      {!isAdmin && showPostModal && (
        <PostPropertyFlow
          onClose={() => setShowPostModal(false)}
          initialTransactionType={postModalTransactionType}
          onSuccessfulPost={handlePostPropertySuccess}
        />
      )}
    </>
  );
}
