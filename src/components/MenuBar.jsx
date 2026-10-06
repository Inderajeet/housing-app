'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import "../styles/MenuBar.css";
import tnMapLeft from "../assets/tn-map.png";
import tnMapRight from "../assets/tn-map-rent.png";
import logo from "../assets/logo_new.png";
import PremiumProperties from "./PremiumProperties";
import { useAppContext } from "../app/AppContext";
import { endpoints } from "../api/api";

const MenuBar = ({ menuPremiumProperties = [] }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = useAppContext();
  const [mapLabels, setMapLabels] = useState({});

  useEffect(() => {
    endpoints.getSiteContent('sale', locale)
      .then(res => setMapLabels(res.data?.headings || {}))
      .catch(() => {});
  }, [locale]);

  const isHomePage = pathname === "/search";
  // With no sponsored properties the slots fall back to the sale/rent map buttons
  const showPremiumSlots = isHomePage && menuPremiumProperties.length > 0;
  const propertyPathParts = pathname.split("/").filter(Boolean);
  const propertyMode = propertyPathParts[0] === "property" ? propertyPathParts[1] : null;
  const currentLookingTo = isHomePage
    ? searchParams.get("type") || "rent"
    : propertyMode || searchParams.get("type") || "sale";

  return (
    <div className={`menu-bar-container ${currentLookingTo === "rent" ? "menu-bar-rent" : "menu-bar-sale"}`}>
      <div className="menu-content">
        {showPremiumSlots ? (
          <div className="menu-premium-slot menu-premium-left">
            <PremiumProperties
              properties={menuPremiumProperties}
              position="menu-left"
              initialIndex={0}
              layout="menu"
            />
          </div>
        ) : (
          <Link
            className="menu-left-section menu-action-card menu-sale-card"
            href="/?type=sale"
            style={{ backgroundImage: `url(${tnMapLeft.src || tnMapLeft})` }}
          >
            <div className="section-overlay sale-overlay" />
            {/* SALE MAP */}
            <span className="section-text">{mapLabels.home_salemap_label || ''}</span>
          </Link>
        )}

        <Link href="/" className="menu-center menu-logo-card">
          <Image src={logo} alt="Logo" className="logo-image" width={139} height={135} priority />
        </Link>

        {showPremiumSlots ? (
          <div className="menu-premium-slot menu-premium-right">
            <PremiumProperties
              properties={menuPremiumProperties}
              position="menu-right"
              initialIndex={1}
              layout="menu"
            />
          </div>
        ) : (
          <Link
            className="menu-right-section menu-action-card menu-rent-card"
            href="/?type=rent"
            style={{ backgroundImage: `url(${tnMapRight.src || tnMapRight})` }}
          >
            <div className="section-overlay rent-overlay" />
            {/* RENT MAP */}
            <span className="section-text">{mapLabels.home_rentmap_label || ''}</span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default MenuBar;
