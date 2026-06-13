'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Map as MapIcon, CalendarCheck, Image as ImageIcon } from 'lucide-react';
import { endpoints } from '../api/api';
import dynamic from 'next/dynamic';
const GalleryMap = dynamic(() => import('./GalleryMap'), { ssr: false, loading: () => <div style={{ height: 300 }} /> });
import BookingFlow from './BookingFlow';
import SeoHelmet from './SeoHelmet';
import { getKeywordString, getLocationLabel, getPriceLabel, getPropertyDisplayName, getPropertyTypeLabel, getTransactionLabel } from '../utils/seo';
import '../styles/ProjectDetailsPage.css';
import '../styles/UnifiedMap.css';
import '../styles/GalleryMap.css';

export default function ProjectDetailsView({ routeIdentifier = '', routeMode = null, routeCategory = null }) {
  const [project, setProject] = useState(null);
  const [activePanel, setActivePanel] = useState('map');
  const [mapThumbFailed, setMapThumbFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generalStatus, setGeneralStatus] = useState({ totalBooked: 0, confirmedCount: 0, isFinalized: false });
  const [isBlocked, setIsBlocked] = useState(false);
  const [propertyStatus, setPropertyStatus] = useState(null);
  const [showImageDetails, setShowImageDetails] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const freshProject = await endpoints.getPropertyByIdentifier({
          mode: routeMode,
          category: routeCategory,
          identifier: routeIdentifier,
        });
        setProject(freshProject);
        setError(null);
      } catch (err) {
        setError('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [routeCategory, routeIdentifier, routeMode]);

  useEffect(() => {
    if (project) {
      const isRent = !!project.rent_amount;
      setPropertyStatus(isRent ? project.rent_status : project.sale_status);
    }
  }, [project]);

  const getMediaSource = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.url || item.src || item.image_url || item.file_url || '';
  };

  const toMediaObject = (item) => {
    const src = getMediaSource(item);
    if (!src) return null;
    return { src, type: (item?.asset_type || item?.type || item?.category || '').toLowerCase() };
  };

  const isRent = !!project?.rent_amount;
  const isPlotOrFlat = ['plot', 'flat'].includes((project?.sale_type || '').toLowerCase());
  const showBoundaryPanel = !isRent && ['land', 'house'].includes((project?.sale_type || '').toLowerCase()) && (
    project?.boundary_north || project?.boundary_south || project?.boundary_east || project?.boundary_west
  );

  const dedupeBySrc = (items) => {
    const seen = new Set();
    return items.filter((item) => {
      if (!item?.src || seen.has(item.src)) return false;
      seen.add(item.src);
      return true;
    });
  };

  const rawImages = useMemo(() => Array.isArray(project?.images) ? project.images : [], [project?.images]);
  const imageMedia = useMemo(() => rawImages.map(toMediaObject).filter(Boolean), [rawImages]);
  const drawingByType = useMemo(() => imageMedia.filter((img) => img.type === 'drawing'), [imageMedia]);
  const nonDrawingImages = useMemo(() => imageMedia.filter((img) => img.type !== 'drawing'), [imageMedia]);

  const drawingSources = useMemo(() => [
    ...(Array.isArray(project?.drawings) ? project.drawings : []),
    project?.drawing_image,
  ].map(toMediaObject).filter(Boolean), [project?.drawings, project?.drawing_image]);

  const drawingImages = useMemo(
    () => isPlotOrFlat ? dedupeBySrc([...drawingByType, ...drawingSources]) : [],
    [isPlotOrFlat, drawingByType, drawingSources]
  );
  const normalImages = useMemo(() => dedupeBySrc(nonDrawingImages), [nonDrawingImages]);

  // Drawing gets its own dedicated panel block for plots/flats
  const hasDrawing = drawingImages.length > 0;

  const mediaTabs = useMemo(() => normalImages.map((img, idx) => ({
    id: `image-${idx + 1}`,
    label: normalImages.length === 1 ? 'Images' : `Image ${idx + 1}`,
    src: img.src,
  })), [normalImages]);

  const hasMediaTabs = mediaTabs.length > 0;
  const activeMediaTab = useMemo(
    () => mediaTabs.find((tab) => `media:${tab.id}` === activePanel),
    [mediaTabs, activePanel]
  );

  useEffect(() => {
    if (activePanel.startsWith('media:') && !activeMediaTab) {
      setActivePanel('map');
      return;
    }
    setShowImageDetails(activePanel.startsWith('media:'));
  }, [activePanel, activeMediaTab]);

  const handleStatusChange = (newStatus) => {
    setPropertyStatus(newStatus);
    if (project) {
      const isRentProp = !!project.rent_amount;
      if (isRentProp) {
        setProject(prev => ({ ...prev, rent_status: newStatus }));
      } else {
        setProject(prev => ({ ...prev, sale_status: newStatus }));
      }
    }
    if (newStatus === 'SOLD' || newStatus === 'RENTED') setIsBlocked(true);
  };

  useEffect(() => {
    const MOCK_GENERAL_STATUS_DB = {
      '1': { totalBooked: 5, confirmedCount: 2, isFinalized: false },
      '18782388': { totalBooked: 1, confirmedCount: 1, isFinalized: true },
    };
    const status = MOCK_GENERAL_STATUS_DB[routeIdentifier] || { totalBooked: 0, confirmedCount: 0, isFinalized: false };
    setGeneralStatus(status);
    if (status.isFinalized) setIsBlocked(true);
  }, [routeIdentifier]);

  if (loading) return (
    <div className="details-loading-screen">
      <div className="home-loader-card">
        <div className="home-loader-spinner" aria-hidden="true" />
        <p className="home-loader-text">Loading property details</p>
      </div>
    </div>
  );
  if (error || !project) return <div className="details-container error">Property not found or failed to load.</div>;

  const displayTitle = project.formatted_id || project.title;
  const transactionLabel = getTransactionLabel(isRent ? 'rent' : 'sale');
  const locationLabel = getLocationLabel(project);
  const propertyName = getPropertyDisplayName(project);
  const propertyTypeLabel = getPropertyTypeLabel(project);
  const priceLabel = getPriceLabel(project);
  const pageTitle = `${propertyName} for ${transactionLabel} in ${locationLabel} | TN Property Mandi`;
  const pageDescription = `Check out this ${propertyName} in ${locationLabel}. Features: ${project.bhk ? `${project.bhk} BHK, ` : ''}${priceLabel ? `${priceLabel}, ` : ''}${propertyTypeLabel}. View photos and contact the owner on TN Property Mandi.`;
  const pageKeywords = getKeywordString([
    `${locationLabel} real estate`,
    project.bhk ? `${project.bhk} BHK house in ${locationLabel}` : '',
    `${propertyTypeLabel} in ${locationLabel}`,
    `${propertyName} ${locationLabel}`,
  ]);
  const canonical = typeof window !== 'undefined' ? window.location.href : '';
  const firstImage = Array.isArray(project.images) && project.images.length > 0
    ? (typeof project.images[0] === 'string' ? project.images[0] : project.images[0]?.url)
    : '';

  const formatPrice = (price) => {
    if (price == null || price === '' || Number.isNaN(Number(price)) || Number(price) === 0) return null;
    const n = Number(price);
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  const cardLandmark = project ? (project.street_name_or_road_name || project.landmark || project.street_name || '') : '';
  const cardLayoutName = project ? (project.title || project.layout_name || '') : '';
  const cardLayoutOrLandmark = cardLayoutName || cardLandmark || '';
  const cardLocationStr = project ? (cardLayoutName
    ? (cardLandmark || [project.village_name, project.taluk_name].filter(Boolean).join(', ') || project.district_name || '')
    : ([project.village_name, project.taluk_name].filter(Boolean).join(', ') || project.district_name || '')) : '';
  const cardIdPart = project?.formatted_id || '';
  const cardSaleType = (project?.sale_type || '').toLowerCase();
  const cardTypePart = isRent
    ? ((project?.property_use || '').toLowerCase() === 'commercial' ? 'commercial' : project?.bhk ? `${project.bhk}BHK` : 'residential')
    : (cardSaleType || 'property');
  const cardRatePart = isRent ? formatPrice(project?.rent_amount) : formatPrice(project?.sale_price || project?.price);
  const cardRateWithUnit = isRent
    ? (cardRatePart ? `${cardRatePart}/mo` : '')
    : (project?.rate_unit && cardRatePart ? `${cardRatePart}/${project.rate_unit}` : cardRatePart || '');
  const cardExtentPart = [project?.extension, project?.area_size].filter(Boolean).join(' ')
    || [project?.extent_area, project?.extent_unit].filter(Boolean).join(' ');
  const cardThirdLine = [cardIdPart, cardTypePart, cardRateWithUnit, cardExtentPart].filter(Boolean).join(' / ');
  const cardAreaSpeed = project?.area_sales_speed != null
    ? `${Number(project.area_sales_speed).toFixed(1)}/mo`
    : project?.area_speed != null ? `${Number(project.area_speed).toFixed(1)}/mo` : '—';

  const mapThumbSrc = (
    Number.isFinite(parseFloat(project.latitude)) &&
    Number.isFinite(parseFloat(project.longitude)) &&
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API
  )
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${parseFloat(project.latitude)},${parseFloat(project.longitude)}&zoom=15&size=320x180&markers=color:red%7C${parseFloat(project.latitude)},${parseFloat(project.longitude)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API}`
    : '';

  const mapLocation = {
    lat: parseFloat(project.latitude),
    lng: parseFloat(project.longitude),
    taluk_name: project.taluk_name,
    village_name: project.village_name,
  };

  return (
    <div className={`project-details-page new-layout ${isRent ? 'details-rent-theme' : 'details-sale-theme'}`}>
      <SeoHelmet title={pageTitle} description={pageDescription} keywords={pageKeywords} canonical={canonical} image={firstImage || undefined} />

      <div className="main-content-flow-wrapper">
        <div className="fullview-tab-layout">
          <div className="fullview-main-area">
            <div className={`fullview-panel ${activePanel === 'map' ? 'map-active-panel' : ''}`}>
              {activePanel === 'map' && (
                <div className="panel-content map-panel-content">
                  <GalleryMap location={mapLocation} title={displayTitle} status={propertyStatus} propertyData={project} />
                </div>
              )}

              {activePanel === 'booking' && (
                <div className="panel-content booking-panel-content">
                  <BookingFlow
                    propertyId={project.property_id || routeIdentifier}
                    projectType={project.property_type?.toLowerCase()}
                    transactionType={isRent ? 'rent' : 'sale'}
                    saleType={project.sale_type}
                    bookedPeopleCount={project.booked_people_count}
                    generalStatus={generalStatus}
                    isBlocked={isBlocked || project.rent_status === 'RENTED' || project.sale_status === 'SOLD'}
                    onStageUpdate={() => {}}
                    onStatusChange={handleStatusChange}
                  />
                </div>
              )}

              {activeMediaTab && (
                <div className="panel-content single-image-panel-content">
                  <div className="single-image-title-row">
                    <h2 className="section-title">{activeMediaTab.label}</h2>
                    {!showImageDetails && (
                      <button type="button" className="image-details-btn" onClick={() => setShowImageDetails(true)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8" strokeWidth="3"/><line x1="12" y1="12" x2="12" y2="16"/></svg>
                        Details
                      </button>
                    )}
                  </div>
                  <div className="single-image-frame-area">
                    <div className="single-image-frame">
                      <img src={activeMediaTab.src} alt={activeMediaTab.label} />
                    </div>
                    {showImageDetails && (
                      <div className="gallery-map-overlay-card image-panel-card">
                        <button className="popup-close-btn" onClick={() => setShowImageDetails(false)} aria-label="Close">✕</button>
                        {(cardLocationStr || cardLayoutOrLandmark) && (
                          <div className="popup-location">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            {cardLocationStr && <span className="popup-loc-text">{cardLocationStr}</span>}
                            {cardLocationStr && cardLayoutOrLandmark && <span className="popup-loc-sep">|</span>}
                            {cardLayoutOrLandmark && <span className="popup-layout-inline">{cardLayoutOrLandmark}</span>}
                          </div>
                        )}
                        {cardThirdLine && <div className="popup-info-line">{cardThirdLine}</div>}
                        <div className={`popup-ratings-grid${isRent ? ' popup-ratings-grid-2col' : ''}`}>
                          {!isRent && (
                            <>
                              <div className="popup-rating-item popup-rating-item-legal"><span className="popup-rating-label">Legal</span><span className="popup-rating-sublabel">grade</span><span className="popup-rating-value">{project?.legal_value ?? '—'}</span></div>
                              <div className="popup-rating-item popup-rating-item-speed"><span className="popup-rating-label">Area Sales</span><span className="popup-rating-sublabel">speed</span><span className="popup-rating-value">{cardAreaSpeed}</span></div>
                            </>
                          )}
                          <div className="popup-rating-item popup-rating-item-amenities"><span className="popup-rating-label">Amenities</span><span className="popup-rating-sublabel">rating</span><span className="popup-rating-value">{project?.amenities_rating != null ? Number(project.amenities_rating).toFixed(1) : '—'}</span></div>
                          <div className="popup-rating-item popup-rating-item-location"><span className="popup-rating-label">Location</span><span className="popup-rating-sublabel">score</span><span className="popup-rating-value">{project?.utilities_rating != null ? Number(project.utilities_rating).toFixed(1) : '—'}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activePanel === 'boundary' && showBoundaryPanel && (
                <div className="panel-content boundary-panel-content">
                  <h2 className="section-title">Boundary Details</h2>
                  <div className="boundary-card">
                    <div className="boundary-grid">
                      <div className="boundary-input north">
                        <label>North</label>
                        <input type="text" value={project.boundary_north || ''} readOnly className="input-field" />
                      </div>
                      <div className="boundary-center-row">
                        <div className="boundary-input west">
                          <label>West</label>
                          <input type="text" value={project.boundary_west || ''} readOnly className="input-field" />
                        </div>
                        <div className="boundary-box-label">BOUNDARY</div>
                        <div className="boundary-input east">
                          <label>East</label>
                          <input type="text" value={project.boundary_east || ''} readOnly className="input-field" />
                        </div>
                      </div>
                      <div className="boundary-input south">
                        <label>South</label>
                        <input type="text" value={project.boundary_south || ''} readOnly className="input-field" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activePanel === 'drawing' && hasDrawing && (
                <div className="panel-content single-image-panel-content">
                  <h2 className="section-title">Layout Drawing</h2>
                  <div className="single-image-frame">
                    <img src={drawingImages[0].src} alt="Layout Drawing" />
                  </div>
                </div>
              )}
            </div>

            {project.description && (
              <div className="property-description-section">
                <h2 className="section-title">About this property</h2>
                <p className="description-text">{project.description}</p>
              </div>
            )}
          </div>

          <div className="panel-thumbnails">
            <button type="button" className={`panel-thumb ${activePanel === 'map' ? 'active' : ''}`} onClick={() => setActivePanel('map')}>
              <div className="panel-thumb-media">
                {mapThumbSrc && !mapThumbFailed ? (
                  <img src={mapThumbSrc} alt="Map preview" onError={() => setMapThumbFailed(true)} />
                ) : (
                  <div className="panel-thumb-fallback"><MapIcon size={16} /></div>
                )}
              </div>
              <span>Street View</span>
            </button>

            <button type="button" className={`panel-thumb booking-thumb ${activePanel === 'booking' ? 'active' : ''}`} onClick={() => setActivePanel('booking')}>
              <CalendarCheck size={18} />
              <span>Book Visit</span>
            </button>

            {showBoundaryPanel && (
              <button type="button" className={`panel-thumb ${activePanel === 'boundary' ? 'active' : ''}`} onClick={() => setActivePanel('boundary')}>
                <div className="panel-thumb-media boundary-thumb-preview" aria-hidden="true">
                  <div className="boundary-thumb-label boundary-thumb-label-north">N</div>
                  <div className="boundary-thumb-middle">
                    <div className="boundary-thumb-label boundary-thumb-label-west">W</div>
                    <div className="boundary-thumb-box">BOUNDARY</div>
                    <div className="boundary-thumb-label boundary-thumb-label-east">E</div>
                  </div>
                  <div className="boundary-thumb-label boundary-thumb-label-south">S</div>
                </div>
                <span>Boundaries</span>
              </button>
            )}

            {hasDrawing && (
              <button type="button" className={`panel-thumb ${activePanel === 'drawing' ? 'active' : ''}`} onClick={() => setActivePanel('drawing')}>
                <div className="panel-thumb-media">
                  <img src={drawingImages[0].src} alt="Layout Drawing preview" />
                </div>
                <span>Drawing</span>
              </button>
            )}

            {hasMediaTabs && (
              <div className="media-thumbs-grid">
                {mediaTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`panel-thumb media-thumb ${activePanel === `media:${tab.id}` ? 'active' : ''}`}
                    onClick={() => setActivePanel(`media:${tab.id}`)}
                  >
                    <div className="panel-thumb-media">
                      {tab.src ? (
                        <img src={tab.src} alt={`${tab.label} preview`} />
                      ) : (
                        <div className="panel-thumb-fallback"><ImageIcon size={16} /></div>
                      )}
                    </div>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
