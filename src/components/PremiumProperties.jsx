'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getPropertyHref } from '../utils/propertyRouting';
import '../styles/PremiumProperites.css';

const MOBILE_BREAKPOINT = 768;

const getPrimaryImage = (property) => {
  const images = Array.isArray(property?.images) ? property.images : [];
  if (images.length === 0) return null;
  const first = images[0];
  if (typeof first === 'string') return first;
  if (typeof first === 'object' && first?.url) return first.url;
  return null;
};

const PremiumProperties = ({
  properties = [],
  intervalMs = 3500,
  position = 'bottom',
  initialIndex = 0,
  layout = 'floating',
  className = '',
}) => {
  const adProperties = useMemo(
    () => properties.filter((property) => !!getPrimaryImage(property)),
    [properties]
  );

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handleViewportChange = (event) => setIsMobileView(event.matches);
    setIsMobileView(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleViewportChange);
    return () => mediaQuery.removeEventListener('change', handleViewportChange);
  }, []);

  useEffect(() => {
    if (adProperties.length === 0) return;
    setActiveIndex(initialIndex % adProperties.length);
  }, [initialIndex, adProperties.length]);

  useEffect(() => {
    if (activeIndex >= adProperties.length) setActiveIndex(0);
  }, [activeIndex, adProperties.length]);

  useEffect(() => {
    if (adProperties.length <= 1) return;
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % adProperties.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [adProperties.length, intervalMs]);

  if (adProperties.length === 0) return null;

  const safeIndex = activeIndex >= 0 && activeIndex < adProperties.length ? activeIndex : 0;
  const activeProperty = adProperties[safeIndex];
  const imageUrl = getPrimaryImage(activeProperty);
  if (!activeProperty || !imageUrl) return null;

  const propertyHref = getPropertyHref(activeProperty);
  const isInteractive = !!activeProperty.property_id;

  const prevAd = (event) => {
    event.stopPropagation();
    event.preventDefault();
    setActiveIndex((prev) => (prev - 1 + adProperties.length) % adProperties.length);
  };

  const nextAd = (event) => {
    event.stopPropagation();
    event.preventDefault();
    setActiveIndex((prev) => (prev + 1) % adProperties.length);
  };

  const layoutClass =
    layout === 'menu' ? 'premium-ads-menu' :
    layout === 'landing' ? 'premium-ads-landing' : '';

  const imageAlt = activeProperty.formatted_id || activeProperty.title || 'Property Ad';

  return (
    <div className={`premium-ads-floating premium-ads-${position} ${layoutClass} ${className}`.trim()}>
      {isInteractive ? (
        <Link className="premium-ads-link" href={propertyHref}>
          <div className="premium-ads-label">Sponsored</div>
          <img src={imageUrl} alt={imageAlt} className="premium-ads-image" />
        </Link>
      ) : (
        <>
          <div className="premium-ads-label">Sponsored</div>
          <img src={imageUrl} alt={imageAlt} className="premium-ads-image" />
        </>
      )}

      {adProperties.length > 1 && (
        <>
          <button
            type="button"
            className="premium-ads-nav prev"
            onClick={prevAd}
            aria-label={isMobileView ? 'Previous sponsored property on mobile' : 'Previous sponsored property'}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button
            type="button"
            className="premium-ads-nav next"
            onClick={nextAd}
            aria-label={isMobileView ? 'Next sponsored property on mobile' : 'Next sponsored property'}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </>
      )}
    </div>
  );
};

export default PremiumProperties;
