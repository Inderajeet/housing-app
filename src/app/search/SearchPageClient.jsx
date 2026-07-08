'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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

  // Tracks, per location level, which URL slug value has already been through the resolve effect
  // below (matched into filters, or confirmed unmatched). Using refs (not filters.district_id)
  // keeps this fully decoupled from interactive dropdown selection — picking a district directly
  // sets filters.district_id without ever changing queryDistrict, so comparing against filters
  // state would wrongly treat that as "still pending" and deadlock the URL sync effect.
  const resolvedQueryDistrictRef = useRef(undefined);
  const resolvedQueryTalukRef = useRef(undefined);
  const resolvedQueryVillageRef = useRef(undefined);
  const districtPending = !!queryDistrict && resolvedQueryDistrictRef.current !== queryDistrict;
  const talukPending = !!queryTaluk && resolvedQueryTalukRef.current !== queryTaluk;
  const villagePending = !!queryVillage && resolvedQueryVillageRef.current !== queryVillage;

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
  const [listingsPanelWide, setListingsPanelWide] = useState(false);

  // Keeps the loading screen up while a saved location is being restored from sessionStorage,
  // so the page never flashes the unfiltered list before jumping to the filtered one.
  const [restoringSession, setRestoringSession] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (queryDistrict || queryTaluk || queryVillage) return false;
    try {
      const saved = JSON.parse(sessionStorage.getItem('search_location_filters') || 'null');
      return !!(saved && (saved.district || saved.taluk || saved.village));
    } catch { return false; }
  });
  const intendedRestoreRef = useRef(undefined); // undefined = not yet attempted, false = nothing to restore, object = in progress

  // Restore last-used district/taluk/village from this tab's session if the URL arrived with none
  // (e.g. coming back from a property detail page or the home page, which don't carry these params)
  useEffect(() => {
    if (intendedRestoreRef.current !== undefined) return;
    if (queryDistrict || queryTaluk || queryVillage) {
      intendedRestoreRef.current = false;
      setRestoringSession(false);
      return;
    }
    try {
      const saved = JSON.parse(sessionStorage.getItem('search_location_filters') || 'null');
      if (!saved || (!saved.district && !saved.taluk && !saved.village)) {
        intendedRestoreRef.current = false;
        setRestoringSession(false);
        return;
      }
      intendedRestoreRef.current = saved;
      const nextParams = new URLSearchParams(searchParams.toString());
      if (saved.district) nextParams.set('district', saved.district);
      if (saved.taluk) nextParams.set('taluk', saved.taluk);
      if (saved.village) nextParams.set('village', saved.village);
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    } catch {
      intendedRestoreRef.current = false;
      setRestoringSession(false);
    }
  }, [queryDistrict, queryTaluk, queryVillage, searchParams, router, pathname]);

  // Clear the restoring gate once the restored params have landed in the URL and resolved into
  // filters (or the matching list has loaded and found no match, so there's nothing left to wait for)
  useEffect(() => {
    if (!restoringSession) return;
    const intended = intendedRestoreRef.current;
    if (!intended) return;
    const urlMatches =
      (!intended.district || queryDistrict === intended.district) &&
      (!intended.taluk || queryTaluk === intended.taluk) &&
      (!intended.village || queryVillage === intended.village);
    if (!urlMatches) return;
    if (districtPending || talukPending || villagePending) return;
    setRestoringSession(false);
  }, [restoringSession, queryDistrict, queryTaluk, queryVillage, districtPending, talukPending, villagePending]);

  // Safety net: never let a restore attempt hold the loading screen indefinitely
  useEffect(() => {
    if (!restoringSession) return;
    const t = setTimeout(() => setRestoringSession(false), 4000);
    return () => clearTimeout(t);
  }, [restoringSession]);

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
      resolvedQueryDistrictRef.current = queryDistrict;
      return;
    }
    const found = districtsList.find(d => normalizeUrlName(d.district_name) === queryDistrict);
    if (found) setFilters(prev =>
      prev.district_id === String(found.district_id) ? prev :
      { ...prev, district: found.district_name, district_id: String(found.district_id) }
    );
    resolvedQueryDistrictRef.current = queryDistrict;
  }, [queryDistrict, districtsList]);

  // Resolve taluk name slug → taluk_id
  useEffect(() => {
    if (!taluksList.length) return;
    if (!queryTaluk) {
      setFilters(prev =>
        prev.taluk_id === '' ? prev :
        { ...prev, taluk: '', taluk_id: '', village: '', village_id: '' }
      );
      resolvedQueryTalukRef.current = queryTaluk;
      return;
    }
    const found = taluksList.find(t => normalizeUrlName(t.taluk_name) === queryTaluk);
    if (found) setFilters(prev =>
      prev.taluk_id === String(found.taluk_id) ? prev :
      { ...prev, taluk: found.taluk_name, taluk_id: String(found.taluk_id) }
    );
    resolvedQueryTalukRef.current = queryTaluk;
  }, [queryTaluk, taluksList]);

  // Resolve village name slug → village_id
  useEffect(() => {
    if (!villagesList.length) return;
    if (!queryVillage) {
      setFilters(prev =>
        prev.village_id === '' ? prev :
        { ...prev, village: '', village_id: '' }
      );
      resolvedQueryVillageRef.current = queryVillage;
      return;
    }
    const found = villagesList.find(v => normalizeUrlName(v.village_name) === queryVillage);
    if (found) setFilters(prev =>
      prev.village_id === String(found.village_id) ? prev :
      { ...prev, village: found.village_name, village_id: String(found.village_id) }
    );
    resolvedQueryVillageRef.current = queryVillage;
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
    // While a sessionStorage restore is in flight, its own router.replace hasn't landed in the
    // URL yet (queryDistrict etc. are still empty for this render), so the pending checks below
    // wouldn't catch it — this effect would otherwise fire its own replace with the current
    // (still-empty) filters.district/taluk and immediately clobber the restore's replace. Just
    // wait for the restore to settle (or determine there's nothing to restore) before syncing.
    if (restoringSession) return;

    // Don't strip a location param that's still in the URL but hasn't been resolved into
    // filters yet (district/taluk/village lists load async) — otherwise a restored or
    // freshly-typed URL param gets wiped out before it has a chance to resolve. This is based
    // on the resolve effects' own per-slug ref tracking, not filters state, so it never conflicts
    // with interactive dropdown selection (which sets filters directly, without a queryDistrict
    // change). Once the list has loaded and truly found no match (stale/invalid slug), the ref
    // still gets marked and pending falls to false, so the sync can clean up the URL.
    if (districtPending || talukPending || villagePending) return;

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
  }, [filters.lookingTo, filters.type, filters.district, filters.taluk, filters.village, restoringSession, districtPending, talukPending, villagePending, searchParams, router, pathname]);

  // Remember the last-used location filters for this tab so they survive navigating away and back
  useEffect(() => {
    try {
      sessionStorage.setItem('search_location_filters', JSON.stringify({
        district: filters.district ? normalizeUrlName(filters.district) : '',
        taluk: filters.taluk ? normalizeUrlName(filters.taluk) : '',
        village: filters.village ? normalizeUrlName(filters.village) : '',
      }));
    } catch {}
  }, [filters.district, filters.taluk, filters.village]);

  useEffect(() => {
    const params = { property_type: filters.lookingTo };
    if (filters.type) {
      if (filters.lookingTo === 'sale') {
        params.sale_type = filters.type;
      } else {
        if (filters.type === 'commercial') {
          params.property_use = 'commercial';
        } else if (['1', '2', '3'].includes(String(filters.type))) {
          params.bhk = filters.type;
        }
      }
    }
    if (filters.district_id) params.district_id = filters.district_id;
    if (filters.taluk_id) params.taluk_id = filters.taluk_id;
    if (filters.village_id) params.village_id = filters.village_id;
    endpoints.getPremium(params)
      .then(res => setDbPremiumProperties(res.data?.data || []))
      .catch(() => {});
  }, [filters.lookingTo, filters.type, filters.district_id, filters.taluk_id, filters.village_id]);

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

  if (loading || restoringSession) {
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

        <div className={`floating-listings-panel ${showListingsPanel ? 'expanded' : 'minimized'}${listingsPanelWide ? ' listings-panel-wide' : ''}`}>
          {showListingsPanel ? (
            <>
              <div className="panel-header">
                <span className="listing-count-header">{filteredProperties.length}+ Properties found</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <button
                    className="close-btn"
                    title={listingsPanelWide ? 'Shrink panel' : 'Expand panel'}
                    onClick={() => setListingsPanelWide(w => !w)}
                    style={{ fontSize: '14px' }}
                  >
                    {listingsPanelWide ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" />
                        <line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    )}
                  </button>
                  <button className="close-btn" onClick={() => setShowListingsPanel(false)}>✕</button>
                </div>
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
