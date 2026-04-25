'use client';

import { usePathname } from 'next/navigation';
import MenuBar from '../components/MenuBar';
import PostPropertyFlow from '../components/PostPropertyFlow';
import AnalyticsTracker from '../components/AnalyticsTracker';
import { useAppContext } from './AppContext';

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
      <AnalyticsTracker />
      {!isAdmin && <MenuBar menuPremiumProperties={menuPremiumProperties} />}
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
