'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { endpoints } from '../api/api';

const AppContext = createContext(null);

export function useAppContext() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [showPostModal, setShowPostModal] = useState(false);
  const [postModalTransactionType, setPostModalTransactionType] = useState('rent');
  const [menuPremiumProperties, setMenuPremiumProperties] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchInitialPremiumProperties = async () => {
      try {
        const response = await endpoints.getPremium();
        const properties = response?.data?.data || [];
        if (isMounted) setMenuPremiumProperties(properties);
      } catch {
      }
    };
    fetchInitialPremiumProperties();
    return () => { isMounted = false; };
  }, []);

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
