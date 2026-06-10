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

      <a
        className="whatsapp-float"
        href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '91820008733'}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
      >
        <svg viewBox="0 0 32 32" width="28" height="28" fill="currentColor">
          <path d="M16 0C7.164 0 0 7.163 0 16c0 2.82.736 5.47 2.027 7.773L0 32l8.456-2.004A15.93 15.93 0 0 0 16 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 0 1-6.77-1.853l-.486-.29-5.02 1.19 1.216-4.88-.318-.5A13.259 13.259 0 0 1 2.667 16C2.667 8.637 8.637 2.667 16 2.667S29.333 8.637 29.333 16 23.363 29.333 16 29.333zm7.27-9.907c-.398-.2-2.355-1.162-2.72-1.294-.365-.133-.63-.2-.896.2-.265.398-1.03 1.294-1.263 1.56-.232.265-.465.298-.863.1-.398-.2-1.681-.619-3.202-1.977-1.183-1.057-1.982-2.362-2.214-2.76-.232-.398-.025-.613.175-.81.18-.178.398-.465.597-.698.2-.232.265-.398.398-.664.133-.265.066-.498-.033-.697-.1-.2-.896-2.16-1.228-2.96-.323-.776-.65-.67-.896-.683-.232-.012-.498-.015-.763-.015-.265 0-.697.1-1.063.498-.365.398-1.394 1.362-1.394 3.322s1.427 3.854 1.626 4.12c.2.265 2.808 4.288 6.806 6.016.951.41 1.693.656 2.272.84.954.304 1.822.261 2.508.158.765-.114 2.355-.963 2.688-1.893.332-.93.332-1.727.232-1.893-.099-.166-.365-.265-.763-.465z" />
        </svg>
      </a>
    </div>
  );
}

