'use client';

import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function useAppContext() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [showPostModal, setShowPostModal] = useState(false);
  const [postModalTransactionType, setPostModalTransactionType] = useState('rent');
  const [menuPremiumProperties, setMenuPremiumProperties] = useState([]);

  // menuPremiumProperties is set by SearchPageClient with the correct type-filtered list.
  // Do not prefetch here — an unfiltered prefetch would overwrite the filtered data.

  const handlePostPropertyClick = (transactionType) => {
    setPostModalTransactionType(transactionType);
    setShowPostModal(true);
  };

  const handlePostPropertySuccess = () => {
    setShowPostModal(false);
    alert(
      '✅ Property Submitted Successfully!\n\n' +
      'Our backend team will review your property details.\n' +
      'Approval usually takes up to 24 hours.\n\n' +
      'Thank you for listing with us!'
    );
  };

  return (
    <AppContext.Provider
      value={{
        menuPremiumProperties,
        setMenuPremiumProperties,
        handlePostPropertyClick,
        showPostModal,
        postModalTransactionType,
        handlePostPropertySuccess,
        setShowPostModal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
