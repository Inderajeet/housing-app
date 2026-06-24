'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from '@react-google-maps/api';
import '../styles/GalleryMap.css';
import '../styles/UnifiedMap.css';

const GalleryMap = ({ location, status, title, propertyData = null }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API || '',
  });

  const mapRef = useRef(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showOverlayCard, setShowOverlayCard] = useState(true);
  const [isStreetViewMode, setIsStreetViewMode] = useState(true);
  const hidePopupTimeoutRef = useRef(null);

  const getMarkerColor = () => {
    const isRent = !!(propertyData?.rent_amount);
    const normalized = String(status || '').toLowerCase().replace(/[\s_-]/g, '');
    if (normalized === 'nilbooking' || normalized === 'nil' || normalized === 'available' || normalized === '') {
      return isRent ? '#3b82f6' : '#22c55e';
    }
    if (normalized === 'onbooking') return '#f59e0b';
    if (normalized === 'sold' || normalized === 'rented' || normalized === 'booked' || normalized === 'confirmed') return '#ef4444';
    return isRent ? '#3b82f6' : '#22c55e';
  };

  const position = useMemo(() => {
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') return null;
    return { lat: location.lat, lng: location.lng };
  }, [location?.lat, location?.lng]);

  const createCustomMarker = (color) => ({
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#FFFFFF",
    strokeWeight: 2,
    scale: 1.5,
    anchor: new window.google.maps.Point(12, 24),
    labelOrigin: new window.google.maps.Point(12, 9),
  });

  const formatPrice = (price) => {
    if (price == null || price === '' || Number.isNaN(Number(price)) || Number(price) === 0) return null;
    const n = Number(price);
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  const popupData = useMemo(() => {
    if (propertyData && typeof propertyData === 'object') return propertyData;
    return { formatted_id: title, title, taluk_name: location?.taluk_name, village_name: location?.village_name };
  }, [propertyData, title, location?.taluk_name, location?.village_name]);

  const isRent = !!popupData?.rent_amount;
  const saleType = (popupData?.sale_type || '').toLowerCase();
  const isPlotOrFlat = ['plot', 'flat'].includes(saleType);
  const detailsId = popupData?.formatted_id || popupData?.title || title || 'Property';
  const saleTitle = !isRent && (popupData?.title || popupData?.layout_name) ? (popupData.title || popupData.layout_name) : '';
  const formatRate = () => {
    const price = formatPrice(popupData?.sale_price || popupData?.price);
    if (!price) return null;
    return popupData?.rate_unit ? `${price}/${popupData.rate_unit}` : price;
  };
  const landmark = popupData?.street_name_or_road_name || popupData?.landmark || popupData?.street_name || '';
  const layoutName = popupData?.title || popupData?.layout_name || '';
  const layoutOrLandmark = layoutName || landmark || '';

  const locationStr = layoutName
    ? (landmark || [popupData?.village_name, popupData?.taluk_name].filter(Boolean).join(', ') || popupData?.district_name || '')
    : ([popupData?.village_name, popupData?.taluk_name].filter(Boolean).join(', ') || popupData?.district_name || '');

  const idPart = popupData?.formatted_id || '';
  const typePart = isRent
    ? ((popupData?.property_use || '').toLowerCase() === 'commercial' ? 'commercial' : popupData?.bhk ? `${popupData.bhk}BHK` : 'residential')
    : (saleType || 'property');
  const ratePart = isRent ? formatPrice(popupData?.rent_amount) : formatPrice(popupData?.sale_price || popupData?.price);
  const rateWithUnit = isRent
    ? (ratePart ? `${ratePart}/mo` : '')
    : (popupData?.rate_unit && ratePart ? `${ratePart}/${popupData.rate_unit}` : ratePart || '');
  const extentPart = [popupData?.extension, popupData?.area_size].filter(Boolean).join(' ')
    || [popupData?.extent_area, popupData?.extent_unit].filter(Boolean).join(' ');
  const thirdLine = [idPart, typePart, rateWithUnit, extentPart].filter(Boolean).join(' / ');

  const areaSalesSpeed = popupData?.area_sales_speed != null
    ? `${Number(popupData.area_sales_speed).toFixed(1)}/M`
    : popupData?.area_speed != null
      ? `${Number(popupData.area_speed).toFixed(1)}/M`
      : '—';

  const infoWindowOptions = { pixelOffset: { width: 0, height: -30 }, maxWidth: 280, disableAutoPan: true };

  const renderCardBody = (onClose) => (
    <>
      {onClose && (
        <button className="popup-close-btn" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close">✕</button>
      )}
      {googleMapsUrl && (
        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="gallery-map-gmaps-link" onClick={e => e.stopPropagation()}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Open in Maps
        </a>
      )}

      {(locationStr || layoutOrLandmark) && (
        <div className="popup-location">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {locationStr && <span className="popup-loc-text">{locationStr}</span>}
          {locationStr && layoutOrLandmark && <span className="popup-loc-sep">|</span>}
          {layoutOrLandmark && <span className="popup-layout-inline">{layoutOrLandmark}</span>}
        </div>
      )}

      {thirdLine && (
        <div className="popup-info-line">{thirdLine}</div>
      )}

      <div className={`popup-ratings-grid${isRent ? ' popup-ratings-grid-2col' : ''}`}>
        {!isRent && (
          <>
            <div className="popup-rating-item popup-rating-item-legal">
              <span className="popup-rating-label">Legal</span>
              <span className="popup-rating-sublabel">grade</span>
              <span className="popup-rating-value">{popupData?.legal_value ?? '—'}</span>
            </div>
            <div className="popup-rating-item popup-rating-item-speed">
              <span className="popup-rating-label">Area Sales</span>
              <span className="popup-rating-sublabel">speed</span>
              <span className="popup-rating-value">{areaSalesSpeed}</span>
            </div>
          </>
        )}
        <div className="popup-rating-item popup-rating-item-amenities">
          <span className="popup-rating-label">Amenities</span>
          <span className="popup-rating-sublabel">rating</span>
          <span className="popup-rating-value">
            {popupData?.amenities_rating != null ? `${Number(popupData.amenities_rating).toFixed(1)}/10` : '—'}
          </span>
        </div>
        <div className="popup-rating-item popup-rating-item-location">
          <span className="popup-rating-label">Location</span>
          <span className="popup-rating-sublabel">score</span>
          <span className="popup-rating-value">
            {popupData?.utilities_rating != null ? `${Number(popupData.utilities_rating).toFixed(1)}/10` : '—'}
          </span>
        </div>
      </div>
    </>
  );

  const renderPopupContent = () => (
    <div className="popup-content" style={{ position: 'relative' }}>
      {renderCardBody(() => setShowInfo(false))}
    </div>
  );

  const onMapLoad = (map) => {
    mapRef.current = map;
    const streetView = map.getStreetView();
    streetView.addListener('visible_changed', () => {
      setIsStreetViewMode(streetView.getVisible());
    });

    if (isStreetViewMode && position) {
      const sv = new window.google.maps.StreetViewService();
      sv.getPanorama({ location: position, radius: 50 }, (data, svStatus) => {
        if (svStatus === window.google.maps.StreetViewStatus.OK) {
          streetView.setPosition(position);
          streetView.setPov({ heading: 100, pitch: 0, zoom: 1 });
          streetView.setVisible(true);
          setShowInfo(false);
        } else {
          setIsStreetViewMode(false);
        }
      });
    }
  };

  const clearHidePopupTimer = () => {
    if (hidePopupTimeoutRef.current) {
      clearTimeout(hidePopupTimeoutRef.current);
      hidePopupTimeoutRef.current = null;
    }
  };

  const scheduleHidePopup = () => {
    clearHidePopupTimer();
    hidePopupTimeoutRef.current = setTimeout(() => setShowInfo(false), 120);
  };

  useEffect(() => () => clearHidePopupTimer(), []);

  useEffect(() => {
    if (!mapRef.current || !position) return;
    const streetView = mapRef.current.getStreetView();
    if (isStreetViewMode) {
      const sv = new window.google.maps.StreetViewService();
      sv.getPanorama({ location: position, radius: 50 }, (data, svStatus) => {
        if (svStatus === window.google.maps.StreetViewStatus.OK) {
          streetView.setPosition(position);
          streetView.setPov({ heading: 100, pitch: 0, zoom: 1 });
          streetView.setVisible(true);
          setShowInfo(false);
        } else {
          setIsStreetViewMode(false);
          streetView.setVisible(false);
        }
      });
      return;
    }
    streetView.setVisible(false);
  }, [isStreetViewMode, position]);

  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return <div className="gallery-map-unavailable">📍 Map Location Unavailable</div>;
  }
  if (loadError) return <div className="gallery-map-error">Error loading maps</div>;
  if (!isLoaded) return <div className="gallery-map-loading">Loading...</div>;

  const markerColor = getMarkerColor();
  const statusClass = String(status || '').toLowerCase().replace(/[\s_-]/g, '');

  const googleMapsUrl = position ? `https://www.google.com/maps?q=${position.lat},${position.lng}` : null;

  return (
    <div
      className={`gallery-map-container status-${statusClass}`}
      data-streetview={isStreetViewMode ? 'true' : 'false'}
      style={{ height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}
    >
      {/* Mobile info button — visible only when overlay card is closed */}
      {!showOverlayCard && (
        <button
          className="gallery-map-info-btn"
          onClick={() => setShowOverlayCard(true)}
          aria-label="Property details"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="8" strokeWidth="3" />
            <line x1="12" y1="12" x2="12" y2="16" />
          </svg>
          Details
        </button>
      )}

      {/* Overlay card — shown by default, hidden when closed */}
      {showOverlayCard && (
        <div className="gallery-map-overlay-card">
          <div className="popup-content" style={{ position: 'relative', padding: '8px 0 0' }}>
            {renderCardBody(() => setShowOverlayCard(false))}
          </div>
        </div>
      )}

      {/* Desktop panel — only shown when overlay card is closed */}
      {!showOverlayCard && (
        <aside className="gallery-map-details-panel gallery-map-panel-desktop" aria-label="Property details">
          <div className="popup-content" style={{ position: 'relative', padding: '8px 0 0' }}>
            {renderCardBody(null)}
          </div>
        </aside>
      )}

      {/* Mobile panel — compact label/value layout, only shown when overlay card is closed */}
      {!showOverlayCard && (
      <aside className="gallery-map-details-panel gallery-map-panel-mobile" aria-label="Property details">
        <div className="gallery-map-details-head">
          <h3 className="gallery-map-details-title">{detailsId}</h3>
        </div>
        {saleTitle && <div className="gallery-map-details-subtitle">{saleTitle}</div>}
        <div className="gallery-map-details-list">
          {isRent ? (
            <>
              {formatPrice(popupData?.rent_amount) && (
                <div className="gallery-map-details-row">
                  <span className="label">Rent</span>
                  <span className="value">{formatPrice(popupData?.rent_amount)}/mo</span>
                </div>
              )}
              {popupData?.advance_amount && formatPrice(popupData.advance_amount) && (
                <div className="gallery-map-details-row">
                  <span className="label">Advance</span>
                  <span className="value">{formatPrice(popupData.advance_amount)}</span>
                </div>
              )}
              {landmark && (
                <div className="gallery-map-details-row">
                  <span className="label">Landmark</span>
                  <span className="value">{landmark}</span>
                </div>
              )}
            </>
          ) : isPlotOrFlat ? (
            <>
              {formatRate() && (
                <div className="gallery-map-details-row">
                  <span className="label">Rate</span>
                  <span className="value">{formatRate()}</span>
                </div>
              )}
              {(popupData?.extension || popupData?.area_size || popupData?.extent_area) && (
                <div className="gallery-map-details-row">
                  <span className="label">Extent</span>
                  <span className="value">
                    {[popupData.extension, popupData.area_size].filter(Boolean).join(' ') ||
                     [popupData.extent_area, popupData.extent_unit].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              {formatPrice(popupData?.sale_price || popupData?.price) && (
                <div className="gallery-map-details-row">
                  <span className="label">Rate</span>
                  <span className="value">{formatPrice(popupData?.sale_price || popupData?.price)}</span>
                </div>
              )}
              {(popupData?.extension || popupData?.area_size || popupData?.extent_area) && (
                <div className="gallery-map-details-row">
                  <span className="label">Extent</span>
                  <span className="value">
                    {[popupData.extension, popupData.area_size].filter(Boolean).join(' ') ||
                     [popupData.extent_area, popupData.extent_unit].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}
              {landmark && (
                <div className="gallery-map-details-row">
                  <span className="label">Landmark</span>
                  <span className="value">{landmark}</span>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
      )}

      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={position}
        zoom={15}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
        }}
        onLoad={onMapLoad}
      >
        {typeof window !== 'undefined' && window.google && (
          <>
            <Marker
              position={position}
              icon={createCustomMarker(markerColor)}
              onMouseOver={() => { clearHidePopupTimer(); setShowInfo(true); }}
              onMouseOut={scheduleHidePopup}
              onClick={() => setShowInfo((prev) => !prev)}
            />
            {showInfo && (
              <InfoWindow position={position} onCloseClick={() => setShowInfo(false)} options={infoWindowOptions}>
                <div onMouseEnter={clearHidePopupTimer} onMouseLeave={scheduleHidePopup}>
                  {renderPopupContent()}
                </div>
              </InfoWindow>
            )}
          </>
        )}
      </GoogleMap>
    </div>
  );
};

export default React.memo(GalleryMap);
