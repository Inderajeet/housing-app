'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
const UnifiedMap = dynamic(() => import('../../components/UnifiedMap'), { ssr: false, loading: () => <div className="map-container" /> });
import FilterPanel from '../../components/FilterPanel';
import PropertyListings from '../../components/PropertyListings';
import PremiumProperties from '../../components/PremiumProperties';
import SeoHelmet from '../../components/SeoHelmet';
import { endpoints } from '../../api/api';
import { normalizeCategory, normalizeMode } from '../../utils/propertyRouting';
import { getKeywordString, getLocationLabel, getTransactionLabel } from '../../utils/seo';
import { useAppContext } from '../AppContext';
import '../../styles/HomePage.css';

const hasPremiumImage = (property) => {
  const images = Array.isArray(property?.images) ? property.images : [];
  if (images.length === 0) return false;
  const first = images[0];
  if (typeof first === 'string') return Boolean(first);
  if (typeof first === 'object' && first?.url) return true;
  return false;
};

const LOCATION_DATA = {
  'Chennai': [13.0827, 80.2707],
  'Coimbatore': [11.0168, 76.9558],
  'Madurai': [9.9252, 78.1198],
  'Trichy': [10.7905, 78.7047],
  'Kallakurichi': [11.77, 79.11],
  'Tamil Nadu': [10.7905, 78.7047],
};

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setMenuPremiumProperties } = useAppContext();

  const queryMode = normalizeMode(searchParams.get('type') || 'rent');
  const queryCategory = normalizeCategory(searchParams.get('category'));

  const [districtsList, setDistrictsList] = useState([]);
  const [taluksList, setTaluksList] = useState([]);
  const [villagesList, setVillagesList] = useState([]);

  const [filters, setFilters] = useState({
    state: 'TN',
    district: '',
    district_id: '',
    taluk: '',
    taluk_id: '',
    village: '',
    village_id: '',
    propertyType: 'Apartment',
    lookingTo: queryMode,
    type: queryCategory,
    minPrice: 0,
    maxPrice: 100000000,
    bhk: [],
    showAdvanced: false,
  });

  const [allProperties, setAllProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilterPanel, setShowFilterPanel] = useState(true);
  const [showListingsPanel, setShowListingsPanel] = useState(true);

  useEffect(() => {
    setFilters((prev) => {
      if (prev.lookingTo === queryMode && prev.type === queryCategory) return prev;
      return { ...prev, lookingTo: queryMode, type: queryCategory };
    });
  }, [queryCategory, queryMode]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [distRes, propRes] = await Promise.all([
          endpoints.getDistricts(),
          endpoints.getProperties(filters.lookingTo, filters.type),
        ]);
        setDistrictsList(distRes.data || []);
        setAllProperties(propRes.data?.data || []);
      } catch (error) {
        console.error('Fetch Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [filters.lookingTo, filters.type]);

  // Sync filters → URL
  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('type', filters.lookingTo);
    if (filters.type) {
      nextParams.set('category', filters.type);
    } else {
      nextParams.delete('category');
    }
    const currentQuery = searchParams.toString();
    const nextQuery = nextParams.toString();
    if (currentQuery !== nextQuery) {
      router.replace(`${pathname}?${nextQuery}`, { scroll: false });
    }
  }, [filters.lookingTo, filters.type, searchParams, router, pathname]);

  useEffect(() => {
    if (!filters.district_id) { setTaluksList([]); setVillagesList([]); return; }
    endpoints.getTaluks(filters.district_id).then(res => setTaluksList(res.data || []));
  }, [filters.district_id]);

  useEffect(() => {
    if (!filters.taluk_id) { setVillagesList([]); return; }
    endpoints.getVillages(filters.taluk_id).then(res => setVillagesList(res.data || []));
  }, [filters.taluk_id]);

  const filteredProperties = useMemo(() => {
    return allProperties.filter(p => {
      const dMatch = !filters.district_id || Number(p.district_id) === Number(filters.district_id);
      const tMatch = !filters.taluk_id || Number(p.taluk_id) === Number(filters.taluk_id);
      const vMatch = !filters.village_id || Number(p.village_id) === Number(filters.village_id);
      const price = Number(p.rent_amount || p.sale_price || 0);
      const pMatch = price >= filters.minPrice && price <= filters.maxPrice;
      let bhkMatch = true;
      if (filters.bhk.length > 0) {
        const pBhk = parseInt(p.bhk);
        bhkMatch = filters.bhk.some(f => f === '4+ BHK' ? pBhk >= 4 : parseInt(f) === pBhk);
      }
      return dMatch && tMatch && vMatch && pMatch && bhkMatch;
    });
  }, [filters, allProperties]);

  const premiumProperties = useMemo(() => {
    const filteredPremium = filteredProperties.filter(hasPremiumImage);
    return filteredPremium.length > 0 ? filteredPremium : allProperties.filter(hasPremiumImage);
  }, [filteredProperties, allProperties]);

  // Map center logic
  useEffect(() => {
    if (filters.village_id || filters.taluk_id) {
      if (filteredProperties.length > 0) {
        const firstProp = filteredProperties[0];
        setFilters(prev => ({
          ...prev,
          mapCenter: [Number(firstProp.latitude), Number(firstProp.longitude)],
          mapZoom: filters.village_id ? 15 : 13,
        }));
      }
      return;
    }
    if (filters.district && LOCATION_DATA[filters.district]) {
      setFilters(prev => ({ ...prev, mapCenter: LOCATION_DATA[filters.district], mapZoom: 11 }));
      return;
    }
    setFilters(prev => ({ ...prev, mapCenter: [10.7905, 78.7047], mapZoom: 7 }));
  }, [filters.district_id, filters.taluk_id, filters.village_id]);

  const handleFilterChange = (newValues) => setFilters(prev => ({ ...prev, ...newValues }));

  // Bubble premium properties up to global context (for MenuBar)
  useEffect(() => {
    setMenuPremiumProperties(premiumProperties);
  }, [premiumProperties, setMenuPremiumProperties]);

  if (loading) {
    return (
      <div className="home-container home-loading-screen">
        <div className="home-loader-card">
          <div className="home-loader-spinner" aria-hidden="true" />
          <p className="home-loader-text">Loading {filters.lookingTo} properties</p>
        </div>
      </div>
    );
  }

  const filterPanelClass = `floating-filter-panel ${showFilterPanel ? 'expanded' : 'minimized'} ${filters.showAdvanced ? 'advanced-active' : 'basic-active'}`;
  const transactionLabel = getTransactionLabel(filters.lookingTo);
  const locationLabel = getLocationLabel(filters);
  const pageTitle = `Properties for ${transactionLabel} in ${locationLabel} | TN Property Mandi`;
  const pageDescription = `Explore the latest ${transactionLabel.toLowerCase()} listings in ${locationLabel}. From affordable apartments to villas and commercial spaces, find your perfect property on TN Property Mandi.`;
  const pageKeywords = getKeywordString([
    `${transactionLabel} properties in ${locationLabel}`,
    `${transactionLabel} in ${filters.district || 'Tamil Nadu'}`,
    'TN property search',
    `houses for ${transactionLabel.toLowerCase()} in ${locationLabel}`,
  ]);
  const canonical = typeof window !== 'undefined' ? `${window.location.origin}/search?${searchParams.toString()}` : `/search?${searchParams.toString()}`;

  return (
    <main className="home-container">
      <SeoHelmet title={pageTitle} description={pageDescription} keywords={pageKeywords} canonical={canonical} />

      <div className="main-map-area">
        <div className={filterPanelClass}>
          {showFilterPanel ? (
            <>
              <div className={`basic-filter-section ${filters.showAdvanced ? 'hidden' : 'visible'}`}>
                <div className="location-filter-group">
                  <select
                    aria-label="Select District"
                    value={filters.district_id}
                    onChange={(e) => {
                      const selected = districtsList.find(d => String(d.district_id) === e.target.value);
                      handleFilterChange({
                        district_id: e.target.value,
                        district: selected?.district_name || '',
                        taluk_id: '', taluk: '', village_id: '', village: '',
                      });
                    }}
                  >
                    <option value="">Select District</option>
                    {districtsList.map(d => (
                      <option key={d.district_id} value={d.district_id}>{d.district_name}</option>
                    ))}
                  </select>

                  <select
                    aria-label="Select Taluk"
                    value={filters.taluk_id}
                    onChange={(e) => {
                      const selected = taluksList.find(t => String(t.taluk_id) === e.target.value);
                      handleFilterChange({ taluk_id: e.target.value, taluk: selected?.taluk_name || '', village_id: '', village: '' });
                    }}
                    disabled={!filters.district_id}
                  >
                    <option value="">Select Taluk</option>
                    {taluksList.map(t => (
                      <option key={t.taluk_id} value={t.taluk_id}>{t.taluk_name}</option>
                    ))}
                  </select>

                  <select
                    aria-label="Select Village"
                    value={filters.village_id}
                    onChange={(e) => {
                      const selected = villagesList.find(v => String(v.village_id) === e.target.value);
                      handleFilterChange({ village_id: e.target.value, village: selected?.village_name || '' });
                    }}
                    disabled={!filters.taluk_id}
                  >
                    <option value="">Select Village</option>
                    {villagesList.map(v => (
                      <option key={v.village_id} value={v.village_id}>{v.village_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {filters.showAdvanced && (
                <FilterPanel
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClose={() => handleFilterChange({ showAdvanced: false })}
                  isModal={true}
                />
              )}
            </>
          ) : (
            <button className="minimize-toggle-btn" onClick={() => setShowFilterPanel(true)}>🔍</button>
          )}
        </div>

        <PremiumProperties properties={premiumProperties} position="top" initialIndex={1} mobileAdIndex={0} />
        <PremiumProperties properties={premiumProperties} position="bottom" initialIndex={0} mobileAdIndex={1} />
        <PremiumProperties properties={premiumProperties} position="right-top" initialIndex={2} mobileAdIndex={2} />
        <PremiumProperties properties={premiumProperties} position="right-bottom" initialIndex={3} mobileAdIndex={3} />

        <div className="map-container">
          <UnifiedMap
            properties={filteredProperties}
            activeDistrict={filters.district}
            mapCenter={filters.mapCenter}
            mapZoom={filters.mapZoom}
          />
        </div>

        <div className={`floating-listings-panel ${showListingsPanel ? 'expanded' : 'minimized'}`}>
          {showListingsPanel ? (
            <>
              <div className="panel-header">
                <span className="listing-count-header">{filteredProperties.length}+ Properties found</span>
                <button className="close-btn" onClick={() => setShowListingsPanel(false)}>✕</button>
              </div>
              <PropertyListings
                properties={filteredProperties}
                totalCount={filteredProperties.length}
                isSidePanel={true}
              />
            </>
          ) : (
            <button className="minimize-toggle-btn" onClick={() => setShowListingsPanel(true)}>
              🏠 ({filteredProperties.length})
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
