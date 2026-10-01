'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { endpoints } from '../api/api';

const AppContext = createContext(null);

export function useAppContext() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [showPostModal, setShowPostModal] = useState(false);
  const [postModalTransactionType, setPostModalTransactionType] = useState('rent');
  const [menuPremiumProperties, setMenuPremiumProperties] = useState([]);
  // Site language — always starts as 'ta' so the first client render matches the
  // server-rendered HTML exactly; the saved preference (if any) is applied after
  // mount, deliberately in an effect, to avoid a hydration mismatch.
  const [locale, setLocale] = useState('ta');

  useEffect(() => {
    let saved = null;
    try { saved = window.localStorage.getItem('site_locale'); } catch {}
    if (saved === 'en' || saved === 'ta') setLocale(saved);
  }, []);

  const toggleLocale = () => {
    setLocale(prev => {
      const next = prev === 'ta' ? 'en' : 'ta';
      try { window.localStorage.setItem('site_locale', next); } catch {}
      return next;
    });
  };

  // Shared cross-page site content (e.g. property card labels) — fetched once here
  // rather than per-component, since components like PropertyCard render many times per page.
  const [siteHeadings, setSiteHeadings] = useState({});

  useEffect(() => {
    endpoints.getSiteContent('sale', locale)
      .then(res => setSiteHeadings(res.data?.headings || {}))
      .catch(() => {});
  }, [locale]);

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
        locale,
        toggleLocale,
        siteHeadings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
