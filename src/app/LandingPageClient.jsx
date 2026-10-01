'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PremiumProperties from '../components/PremiumProperties';
import SeoHelmet from '../components/SeoHelmet';
import { getSearchHref } from '../utils/propertyRouting';
import { useAppContext } from './AppContext';
import { endpoints } from '../api/api';
import '../styles/LandingPage.css';


function LanguageToggle({ locale, onToggle, loading }) {
  return (
    <button type="button" className="language-toggle" onClick={onToggle} disabled={loading}>
      <span className={locale === 'ta' ? 'language-toggle-active' : ''}>தமிழ்</span>
      <span className="language-toggle-sep">|</span>
      <span className={locale === 'en' ? 'language-toggle-active' : ''}>English</span>
    </button>
  );
}

function PageLoadingOverlay({ show }) {
  if (!show) return null;
  return (
    <div className="page-loading-overlay">
      <div className="page-loading-spinner" />
    </div>
  );
}

export default function LandingPageClient() {
  const searchParams = useSearchParams();
  const { menuPremiumProperties: contextPremium, handlePostPropertyClick, locale, toggleLocale } = useAppContext();
  const [activeTab, setActiveTab] = useState('BUY');
  const [localPremium, setLocalPremium] = useState([]);
  const [ctaLabels, setCtaLabels] = useState({});
  const [saleBox, setSaleBox] = useState({});
  const [rentBox, setRentBox] = useState({});
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    setContentLoading(true);
    Promise.all([
      endpoints.getSiteContent('sale', locale),
      endpoints.getSiteContent('rent', locale),
    ])
      .then(([saleRes, rentRes]) => {
        setCtaLabels(saleRes.data?.headings || {});
        const sBox = Object.fromEntries((saleRes.data?.flowOptions?.home_box || []).map(o => [o.option_key, o.label]));
        setSaleBox(sBox);
        const rBox = Object.fromEntries((rentRes.data?.flowOptions?.home_box || []).map(o => [o.option_key, o.label]));
        setRentBox(rBox);
      })
      .catch(() => {})
      .finally(() => setContentLoading(false));
  }, [locale]);

  useEffect(() => {
    const tab = searchParams.get('type');
    setActiveTab(tab === 'rent' ? 'RENT' : 'BUY');
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const fetchPremium = async () => {
      try {
        const premiumRes = await endpoints.getPremium();
        if (cancelled) return;
        setLocalPremium(premiumRes?.data?.data || []);
      } catch {}
    };
    fetchPremium();
    return () => { cancelled = true; };
  }, []);

  const targetType = activeTab === 'BUY' ? 'sale' : 'rent';
  const allPremium = localPremium.length > 0 ? localPremium : contextPremium;
  const landingPremiumProperties = useMemo(
    () => allPremium.filter(p => p.property_type === targetType),
    [allPremium, targetType]
  );

  const renderPremiumAds = () => ( 
    <>
      <div className="landing-premium-desktop">
        <div className="landing-premium-grid left-grid">
          <PremiumProperties properties={landingPremiumProperties} layout="landing" position="top" initialIndex={0} />
          <PremiumProperties properties={landingPremiumProperties} layout="landing" position="bottom" initialIndex={1} />
          <PremiumProperties properties={landingPremiumProperties} layout="landing" position="right-top" initialIndex={2} />
          <PremiumProperties properties={landingPremiumProperties} layout="landing" position="right-bottom" initialIndex={3} />
        </div>

        <div className="landing-premium-center-spacer" />

        <div className="landing-premium-grid right-grid">
          <PremiumProperties properties={landingPremiumProperties} layout="landing" position="top" initialIndex={4} />
          <PremiumProperties properties={landingPremiumProperties} layout="landing" position="bottom" initialIndex={5} />
          <PremiumProperties properties={landingPremiumProperties} layout="landing" position="right-top" initialIndex={6} />
          <PremiumProperties properties={landingPremiumProperties} layout="landing" position="right-bottom" initialIndex={7} />
        </div>
      </div>

      <div className="landing-premium-mobile">
        <PremiumProperties properties={landingPremiumProperties} layout="landing" position="top" initialIndex={0} mobileAdIndex={0} className="landing-mobile-premium landing-mobile-premium-left-top" />
        <PremiumProperties properties={landingPremiumProperties} layout="landing" position="bottom" initialIndex={1} mobileAdIndex={1} className="landing-mobile-premium landing-mobile-premium-left-bottom" />
        <PremiumProperties properties={landingPremiumProperties} layout="landing" position="right-top" initialIndex={2} mobileAdIndex={2} className="landing-mobile-premium landing-mobile-premium-right-top" />
        <PremiumProperties properties={landingPremiumProperties} layout="landing" position="right-bottom" initialIndex={3} mobileAdIndex={3} className="landing-mobile-premium landing-mobile-premium-right-bottom" />
        <PremiumProperties properties={landingPremiumProperties} layout="landing" position="right-bottom" initialIndex={4} mobileAdIndex={4} className="landing-mobile-premium landing-mobile-premium-right-bottom-left" />
        <PremiumProperties properties={landingPremiumProperties} layout="landing" position="right-bottom" initialIndex={5} mobileAdIndex={5} className="landing-mobile-premium landing-mobile-premium-right-bottom-top" />
      </div>
    </>
  );

  return (
    <div className="landing-container">
      <PageLoadingOverlay show={contentLoading} />
      <SeoHelmet
        title="TN Property Mandi | Buy, Sell & Rent Properties in Tamil Nadu"
        description="Find the best residential and commercial properties for sale or rent across Tamil Nadu. TN Property Mandi connects buyers and sellers directly. Search plots, houses, and villas today."
        keywords="TN Property Mandi, Tamil Nadu Real Estate, Buy House in TN, Property for Rent Tamil Nadu, Land for sale TN"
        canonical={typeof window !== 'undefined' ? `${window.location.origin}/` : '/'}
      />

      {activeTab === 'BUY' && (
        <div className="landing-side sale-side">
          {renderPremiumAds()}

          <div className="side-content-wrapper">
            <div className="map-sketch-area">
              <div className="interactive-box buy-box">
                {/* BUY */}
                <span className={`center-text${locale === 'en' ? ' center-text-en' : ''}`}>{saleBox.center || ''}</span>
                {/* FLAT */}
                <Link className="box-item" href={getSearchHref('sale', 'flat')}>{saleBox.flat || ''}</Link>
                {/* HOUSE */}
                <Link className="box-item" href={getSearchHref('sale', 'house')}>{saleBox.house || ''}</Link>
                {/* PLOT */}
                <Link className="box-item" href={getSearchHref('sale', 'plot')}>{saleBox.plot || ''}</Link>
                {/* LAND */}
                <Link className="box-item box-item-group" href={getSearchHref('sale', 'land')}>
                  <span className={`box-group-heading${locale === 'en' ? ' box-group-heading-en' : ''}`}>{saleBox.land_group || (locale === 'en' ? 'Individual' : 'தனி')}</span>
                  <span className="box-group-links">{saleBox.land || ''}</span>
                </Link>
              </div>
              <LanguageToggle locale={locale} onToggle={toggleLocale} loading={contentLoading} />
            </div>
            <button className="post-btn sale-btn desktop-only" onClick={() => handlePostPropertyClick('sale')}>
              {/* SALE YOUR PROPERTY */}
              {ctaLabels.sale_postflow_cta_button || ''}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'RENT' && (
        <div className="landing-side rent-side">
          {renderPremiumAds()}

          <div className="side-content-wrapper">
            <div className="map-sketch-area">
              <div className="interactive-box rent-box">
                {/* RENT */}
                <span className={`center-text${locale === 'en' ? ' center-text-en' : ''}`}>{rentBox.center || ''}</span>
                {/* 1 BHK */}
                <Link className="box-item" href={getSearchHref('rent', '1')}>{rentBox['1'] || ''}</Link>
                {/* 2 BHK */}
                <Link className="box-item" href={getSearchHref('rent', '2')}>{rentBox['2'] || ''}</Link>
                {/* 3+ BHK */}
                <Link className="box-item" href={getSearchHref('rent', '3')}>{rentBox['3'] || ''}</Link>
                {/* COMMERCIAL */}
                <Link className="box-item" href={getSearchHref('rent', 'commercial')}>{rentBox.commercial || ''}</Link>
              </div>
              <LanguageToggle locale={locale} onToggle={toggleLocale} loading={contentLoading} />
            </div>
            <button className="post-btn rent-btn desktop-only" onClick={() => handlePostPropertyClick('rent')}>
              {/* RENT YOUR PROPERTY */}
              {ctaLabels.rent_postflow_cta_button || ''}
            </button>
          </div>
        </div>
      )}

      <div className="mobile-only bottom-post-actions">
        {activeTab === 'BUY' ? (
          <button className="post-btn sale-btn mobile-btn" onClick={() => handlePostPropertyClick('sale')}>
            {/* SALE YOUR PROPERTY */}
            {ctaLabels.sale_postflow_cta_button || ''}
          </button>
        ) : (
          <button className="post-btn rent-btn mobile-btn" onClick={() => handlePostPropertyClick('rent')}>
            {/* RENT YOUR PROPERTY */}
            {ctaLabels.rent_postflow_cta_button || ''}
          </button>
        )}
      </div>

      <a
        className="whatsapp-float whatsapp-float-left"
        href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '918220008733'}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Sales and Rental help on WhatsApp"
      >
        <span className="whatsapp-float-icon">
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g transform="translate(2.4,1.6) scale(0.06)">
              <path fill="#fff" d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
            </g>
          </svg>
        </span>
        <span className="whatsapp-float-divider" />
        <span className="whatsapp-float-text">
          {/* சேல்ஸ் & ரெண்டல் */}
          <span>{ctaLabels.home_whatsapp_sales_line1 || ''}</span>
          {/* உதவி ! */}
          <span>{ctaLabels.home_whatsapp_sales_line2 || ''}</span>
        </span>
      </a>

      <a
        className="whatsapp-float whatsapp-float-right"
        href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '918220008733'}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Document ATM and Registration help on WhatsApp"
      >
        <span className="whatsapp-float-icon">
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g transform="translate(2.4,1.6) scale(0.06)">
              <path fill="#fff" d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
            </g>
          </svg>
        </span>
        <span className="whatsapp-float-divider" />
        <span className="whatsapp-float-text">
          {/* ஆவண ATM */}
          <span>{ctaLabels.home_whatsapp_docs_line1 || ''}</span>
          {/* பத்திரப்பதிவு உதவி ! */}
          <span>{ctaLabels.home_whatsapp_docs_line2 || ''}</span>
        </span>
      </a>
    </div>
  );
}

