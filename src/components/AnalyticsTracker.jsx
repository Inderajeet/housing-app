'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import ReactGA from 'react-ga4';

const MEASUREMENT_ID = 'G-P0WNGQF9ZC';
let isInitialized = false;

const AnalyticsTracker = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isInitialized) {
      ReactGA.initialize(MEASUREMENT_ID);
      isInitialized = true;
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    ReactGA.send({
      hitType: 'pageview',
      page: `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`,
      title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
};

export default AnalyticsTracker;
