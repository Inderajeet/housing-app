'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import PremiumProperties from '../components/PremiumProperties';
import SeoHelmet from '../components/SeoHelmet';
import { getSearchHref } from '../utils/propertyRouting';
import { useAppContext } from './AppContext';
import { endpoints } from '../api/api';
import tnmap from '../assets/tnmap.png';
import '../styles/LandingPage.css';


export default function LandingPageClient() {
  const searchParams = useSearchParams();
  const { menuPremiumProperties: contextPremium, handlePostPropertyClick } = useAppContext();
  const [activeTab, setActiveTab] = useState('BUY');
  const [localPremium, setLocalPremium] = useState([]);

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
      <SeoHelmet
        title="TN Property Mandi | Buy, Sell & Rent Properties in Tamil Nadu"
        description="Find the best residential and commercial properties for sale or rent across Tamil Nadu. TN Property Mandi connects buyers and sellers directly. Search plots, houses, and villas today."
        keywords="TN Property Mandi, Tamil Nadu Real Estate, Buy House in TN, Property for Rent Tamil Nadu, Land for sale TN"
        canonical={typeof window !== 'undefined' ? `${window.location.origin}/` : '/'}
      />

      {activeTab === 'BUY' && (
        <div className="landing-side sale-side">
          <div className="map-background-overlay" aria-hidden="true">
            <Image src={tnmap} alt="" fill priority style={{ objectFit: 'contain', objectPosition: 'center' }} />
          </div>
          {renderPremiumAds()}

          <div className="side-content-wrapper">
            <div className="map-sketch-area">
              <div className="interactive-box buy-box">
                <span className="center-text">BUY</span>
                <Link className="box-item" href={getSearchHref('sale', 'flat')}>FLAT</Link>
                <Link className="box-item" href={getSearchHref('sale', 'house')}>HOUSE</Link>
                <Link className="box-item" href={getSearchHref('sale', 'plot')}>PLOT</Link>
                <Link className="box-item" href={getSearchHref('sale', 'land')}>LAND</Link>
              </div>
            </div>
            <button className="post-btn sale-btn desktop-only" onClick={() => handlePostPropertyClick('sale')}>
              POST PROPERTY FOR SALE
            </button>
          </div>
        </div>
      )}

      {activeTab === 'RENT' && (
        <div className="landing-side rent-side">
          <div className="map-background-overlay" aria-hidden="true">
            <Image src={tnmap} alt="" fill priority style={{ objectFit: 'contain', objectPosition: 'center' }} />
          </div>
          {renderPremiumAds()}

          <div className="side-content-wrapper">
            <div className="map-sketch-area">
              <div className="interactive-box rent-box">
                <span className="center-text">RENT</span>
                <Link className="box-item" href={getSearchHref('rent', '1')}>1 BHK</Link>
                <Link className="box-item" href={getSearchHref('rent', '2')}>2 BHK</Link>
                <Link className="box-item" href={getSearchHref('rent', '3')}>3+ BHK</Link>
                <Link className="box-item" href={getSearchHref('rent', 'commercial')}>COMMERCIAL</Link>
              </div>
            </div>
            <button className="post-btn rent-btn desktop-only" onClick={() => handlePostPropertyClick('rent')}>
              POST PROPERTY FOR RENT
            </button>
          </div>
        </div>
      )}

      <div className="mobile-only bottom-post-actions">
        {activeTab === 'BUY' ? (
          <button className="post-btn sale-btn mobile-btn" onClick={() => handlePostPropertyClick('sale')}>
            POST PROPERTY FOR SALE
          </button>
        ) : (
          <button className="post-btn rent-btn mobile-btn" onClick={() => handlePostPropertyClick('rent')}>
            POST PROPERTY FOR RENT
          </button>
        )}
      </div>
    </div>
  );
}

