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
import { normalizeCategory, normalizeMode, normalizeUrlName } from '../../utils/propertyRouting';
import { getKeywordString, getLocationLabel, getTransactionLabel } from '../../utils/seo';
import { useAppContext } from '../AppContext';
import '../../styles/HomePage.css';


export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setMenuPremiumProperties } = useAppContext();

  const queryMode = normalizeMode(searchParams.get('type') || 'rent');
  const queryCategory = normalizeCategory(searchParams.get('category'));
  // URL uses name slugs for locations (human-readable, SEO-friendly)
  const queryDistrict = searchParams.get('district') || '';
  const queryTaluk = searchParams.get('taluk') || '';
  const queryVillage = searchParams.get('village') || '';

  const [districtsList, setDistrictsList] = useState([]);
  const [taluksList, setTaluksList] = useState([]);
  const [villagesList, setVillagesList] = useState([]);
  const [dbPremiumProperties, setDbPremiumProperties] = useState([]);

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

  // Sync URL type/category → filters
  useEffect(() => {
    setFilters((prev) => {
      if (prev.lookingTo === queryMode && prev.type === queryCategory) return prev;
      return { ...prev, lookingTo: queryMode, type: queryCategory };
    });
  }, [queryMode, queryCategory]);

  // Resolve district name slug → district_id (and reset cascades when cleared)
  useEffect(() => {
    if (!districtsList.length) return;
    if (!queryDistrict) {
      setFilters(prev =>
        prev.district_id === '' ? prev :
        { ...prev, district: '', district_id: '', taluk: '', taluk_id: '', village: '', village_id: '' }
      );
      return;
    }
    const found = districtsList.find(d => normalizeUrlName(d.district_name) === queryDistrict);
    if (found) setFilters(prev =>
      prev.district_id === String(found.district_id) ? prev :
      { ...prev, district: found.district_name, district_id: String(found.district_id) }
    );
  }, [queryDistrict, districtsList]);

  // Resolve taluk name slug → taluk_id
  useEffect(() => {
    if (!taluksList.length) return;
    if (!queryTaluk) {
      setFilters(prev =>
        prev.taluk_id === '' ? prev :
        { ...prev, taluk: '', taluk_id: '', village: '', village_id: '' }
      );
      return;
    }
    const found = taluksList.find(t => normalizeUrlName(t.taluk_name) === queryTaluk);
    if (found) setFilters(prev =>
      prev.taluk_id === String(found.taluk_id) ? prev :
      { ...prev, taluk: found.taluk_name, taluk_id: String(found.taluk_id) }
    );
  }, [queryTaluk, taluksList]);

  // Resolve village name slug → village_id
  useEffect(() => {
    if (!villagesList.length) return;
    if (!queryVillage) {
      setFilters(prev =>
        prev.village_id === '' ? prev :
        { ...prev, village: '', village_id: '' }
      );
      return;
    }
    const found = villagesList.find(v => normalizeUrlName(v.village_name) === queryVillage);
    if (found) setFilters(prev =>
      prev.village_id === String(found.village_id) ? prev :
      { ...prev, village: found.village_name, village_id: String(found.village_id) }
    );
  }, [queryVillage, villagesList]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [distRes, propRes] = await Promise.all([
          endpoints.getDistricts(),
          endpoints.getProperties(filters.lookingTo, filters.type),
        ]);
        setDistrictsList(distRes.data || []);
        setAllProperties(propRes.data?.data || []);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [filters.lookingTo, filters.type]);

  // Sync filters → URL (writes name slugs, not IDs)
  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('type', filters.lookingTo);
    if (filters.type) nextParams.set('category', filters.type); else nextParams.delete('category');
    if (filters.district) nextParams.set('district', normalizeUrlName(filters.district)); else nextParams.delete('district');
    if (filters.taluk) nextParams.set('taluk', normalizeUrlName(filters.taluk)); else nextParams.delete('taluk');
    if (filters.village) nextParams.set('village', normalizeUrlName(filters.village)); else nextParams.delete('village');
    // Remove legacy ID params if any
    nextParams.delete('district_id');
    nextParams.delete('taluk_id');
    nextParams.delete('village_id');
    const nextQuery = nextParams.toString();
    if (searchParams.toString() !== nextQuery) {
      router.replace(`${pathname}?${nextQuery}`, { scroll: false });
    }
  }, [filters.lookingTo, filters.type, filters.district, filters.taluk, filters.village, searchParams, router, pathname]);

  useEffect(() => {
    const params = { property_type: filters.lookingTo };
    if (filters.district_id) params.district_id = filters.district_id;
    if (filters.taluk_id) params.taluk_id = filters.taluk_id;
    if (filters.village_id) params.village_id = filters.village_id;
    endpoints.getPremium(params)
      .then(res => setDbPremiumProperties(res.data?.data || []))
      .catch(() => {});
  }, [filters.lookingTo, filters.district_id, filters.taluk_id, filters.village_id]);

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

  const premiumProperties = useMemo(() => dbPremiumProperties, [dbPremiumProperties]);

  // Map center logic — uses lat/lng from DB location lists
  useEffect(() => {
    const selectedVillage = villagesList.find(v => String(v.village_id) === String(filters.village_id));
    const selectedTaluk = taluksList.find(t => String(t.taluk_id) === String(filters.taluk_id));
    const selectedDistrict = districtsList.find(d => String(d.district_id) === String(filters.district_id));

    if (filters.village_id && selectedVillage?.latitude && selectedVillage?.longitude) {
      setFilters(prev => ({ ...prev, mapCenter: [Number(selectedVillage.latitude), Number(selectedVillage.longitude)], mapZoom: 14 }));
    } else if (filters.taluk_id && selectedTaluk?.latitude && selectedTaluk?.longitude) {
      setFilters(prev => ({ ...prev, mapCenter: [Number(selectedTaluk.latitude), Number(selectedTaluk.longitude)], mapZoom: 12 }));
    } else if (filters.district_id && selectedDistrict?.latitude && selectedDistrict?.longitude) {
      setFilters(prev => ({ ...prev, mapCenter: [Number(selectedDistrict.latitude), Number(selectedDistrict.longitude)], mapZoom: 11 }));
    } else {
      setFilters(prev => ({ ...prev, mapCenter: [10.7905, 78.7047], mapZoom: 7 }));
    }
  }, [filters.district_id, filters.taluk_id, filters.village_id, districtsList, taluksList, villagesList]);

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
