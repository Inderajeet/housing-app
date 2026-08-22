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
              SALE YOUR PROPERTY
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
              RENT YOUR PROPERTY
            </button>
          </div>
        </div>
      )}

      <div className="mobile-only bottom-post-actions">
        {activeTab === 'BUY' ? (
          <button className="post-btn sale-btn mobile-btn" onClick={() => handlePostPropertyClick('sale')}>
            SALE YOUR PROPERTY
          </button>
        ) : (
          <button className="post-btn rent-btn mobile-btn" onClick={() => handlePostPropertyClick('rent')}>
            RENT YOUR PROPERTY
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
            <path fill="#25D366" d="M16 0C7.163 0 0 7.163 0 16c0 2.82.738 5.47 2.03 7.765L0 32l8.44-2.01A15.93 15.93 0 0 0 16 32c8.837 0 16-7.163 16-16S24.837 0 16 0Z" />
            <path fill="#fff" d="M23.472 19.36c-.355-.177-2.1-1.036-2.426-1.155-.326-.118-.563-.177-.8.178-.237.355-.918 1.155-1.125 1.392-.207.237-.414.266-.77.089-.355-.178-1.5-.553-2.858-1.762-1.056-.942-1.77-2.106-1.977-2.462-.207-.355-.022-.547.156-.723.16-.16.355-.414.532-.622.178-.207.237-.355.355-.592.118-.237.06-.444-.03-.622-.088-.178-.799-1.925-1.095-2.637-.288-.693-.581-.6-.799-.611-.207-.01-.444-.012-.681-.012-.237 0-.622.089-.947.444-.326.355-1.243 1.215-1.243 2.962 0 1.747 1.273 3.435 1.45 3.672.178.237 2.507 3.826 6.075 5.365.849.367 1.51.586 2.026.75.851.271 1.626.233 2.239.141.683-.102 2.1-.858 2.396-1.687.296-.83.296-1.54.207-1.688-.088-.148-.325-.237-.68-.414Z" />
          </svg>
        </span>
        <span className="whatsapp-float-divider" />
        <span className="whatsapp-float-text">
          <span>சேல்ஸ் &amp; ரெண்டல்</span>
          <span>உதவி !</span>
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
            <path fill="#25D366" d="M16 0C7.163 0 0 7.163 0 16c0 2.82.738 5.47 2.03 7.765L0 32l8.44-2.01A15.93 15.93 0 0 0 16 32c8.837 0 16-7.163 16-16S24.837 0 16 0Z" />
            <path fill="#fff" d="M23.472 19.36c-.355-.177-2.1-1.036-2.426-1.155-.326-.118-.563-.177-.8.178-.237.355-.918 1.155-1.125 1.392-.207.237-.414.266-.77.089-.355-.178-1.5-.553-2.858-1.762-1.056-.942-1.77-2.106-1.977-2.462-.207-.355-.022-.547.156-.723.16-.16.355-.414.532-.622.178-.207.237-.355.355-.592.118-.237.06-.444-.03-.622-.088-.178-.799-1.925-1.095-2.637-.288-.693-.581-.6-.799-.611-.207-.01-.444-.012-.681-.012-.237 0-.622.089-.947.444-.326.355-1.243 1.215-1.243 2.962 0 1.747 1.273 3.435 1.45 3.672.178.237 2.507 3.826 6.075 5.365.849.367 1.51.586 2.026.75.851.271 1.626.233 2.239.141.683-.102 2.1-.858 2.396-1.687.296-.83.296-1.54.207-1.688-.088-.148-.325-.237-.68-.414Z" />
          </svg>
        </span>
        <span className="whatsapp-float-divider" />
        <span className="whatsapp-float-text">
          <span>ஆவண ATM</span>
          <span>பத்திரப்பதிவு உதவி !</span>
        </span>
      </a>
    </div>
  );
}

