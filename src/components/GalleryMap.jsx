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
  const [isStreetViewMode, setIsStreetViewMode] = useState(true);
  const hidePopupTimeoutRef = useRef(null);

  const getMarkerColor = () => {
    const normalized = String(status || '').toLowerCase().replace(/[\s_-]/g, '');
    if (normalized === 'nilbooking' || normalized === 'nil' || normalized === 'available') return '#22c55e';
    if (normalized === 'onbooking') return '#f59e0b';
    if (normalized === 'sold' || normalized === 'rented' || normalized === 'booked') return '#ef4444';
    return '#3b82f6';
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

  const capitalizeFirst = (value) => {
    if (!value || typeof value !== 'string') return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const popupData = useMemo(() => {
    if (propertyData && typeof propertyData === 'object') return propertyData;
    return { formatted_id: title, title, taluk_name: location?.taluk_name, village_name: location?.village_name };
  }, [propertyData, title, location?.taluk_name, location?.village_name]);

  const isRent = !!popupData?.rent_amount;
  const saleType = (popupData?.sale_type || '').toLowerCase();
  const isPlotOrFlat = ['plot', 'flat'].includes(saleType);
  const detailsId = popupData?.formatted_id || popupData?.title || title || 'Property';
  const saleTitle = !isRent && popupData?.title ? popupData.title : '';

  const formatRate = () => {
    const price = formatPrice(popupData?.sale_price || popupData?.price);
    if (!price) return null;
    const unit = popupData?.rate_unit;
    return unit ? `${price}/${unit}` : price;
  };

  const infoWindowOptions = { pixelOffset: { width: 0, height: -30 }, maxWidth: 280, disableAutoPan: true };

  const renderPopupContent = () => (
    <div className="property-popup">
      <div className="popup-content" style={{ position: 'relative' }}>
        <button
          className="popup-close-btn"
          onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
          aria-label="Close"
        >✕</button>
        <div className="popup-header">{popupData?.formatted_id || popupData?.title || title || 'Property'}</div>
        {(isRent ? formatPrice(popupData?.rent_amount) : formatPrice(popupData?.sale_price)) && (
          <div className="popup-price">
            {isRent ? formatPrice(popupData?.rent_amount) : formatPrice(popupData?.sale_price)}
            {isRent && <span className="price-period">/mo</span>}
            {!isRent && isPlotOrFlat && popupData?.rate_unit && (
              <span className="price-period">/{popupData.rate_unit}</span>
            )}
          </div>
        )}
        <div className="popup-details-grid">
          <div className="detail-item">
            <span className="detail-label">Type</span>
            <span className="detail-value">
              {isRent
                ? ((popupData?.property_use || '').toLowerCase() === 'commercial' ? 'Commercial' : `${popupData?.bhk || ''} BHK`.trim() || 'Rental')
                : (capitalizeFirst(popupData?.sale_type) || 'Property')}
            </span>
          </div>
          {popupData?.extent_area && popupData?.extent_unit && (
            <div className="detail-item">
              <span className="detail-label">Area</span>
              <span className="detail-value">{[popupData.extent_area, popupData.extent_unit].filter(Boolean).join(' ').trim()}</span>
            </div>
          )}
          {isRent && popupData?.advance_amount && (
            <div className="detail-item">
              <span className="detail-label">Advance</span>
              <span className="detail-value">{formatPrice(popupData.advance_amount)}</span>
            </div>
          )}
        </div>
        <div className="popup-location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{popupData?.landmark || popupData?.street_name || popupData?.street_name_or_road_name || popupData?.village_name || popupData?.taluk_name || 'Location available'}</span>
        </div>
      </div>
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

  return (
    <div
      className={`gallery-map-container status-${statusClass}`}
      style={{ height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}
    >
      <aside className="gallery-map-details-panel" aria-label="Property details">
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
              {popupData?.landmark && (
                <div className="gallery-map-details-row">
                  <span className="label">Landmark</span>
                  <span className="value">{popupData.landmark}</span>
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
              {popupData?.layout_name && (
                <div className="gallery-map-details-row">
                  <span className="label">Layout</span>
                  <span className="value">{popupData.layout_name}</span>
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
              {popupData?.landmark && (
                <div className="gallery-map-details-row">
                  <span className="label">Landmark</span>
                  <span className="value">{popupData.landmark}</span>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

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
            {showInfo && !isStreetViewMode && (
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
