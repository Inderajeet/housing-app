'use client';

import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { getPropertyHref } from '../utils/propertyRouting';
import '../styles/UnifiedMap.css';

const containerStyle = { width: '100%', height: '100%' };

const UnifiedMap = ({ properties = [], mapCenter, mapZoom }) => {
  const router = useRouter();
  const [hoveredProperty, setHoveredProperty] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const hidePopupTimeoutRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API || '',
  });

  const center = useMemo(() => ({
    lat: mapCenter?.[0] || 10.7905,
    lng: mapCenter?.[1] || 78.7047,
  }), [mapCenter]);

  const zoom = mapZoom || 7;

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const currentCenter = mapRef.current.getCenter();
    const latDiff = Math.abs(currentCenter.lat() - center.lat);
    const lngDiff = Math.abs(currentCenter.lng() - center.lng);
    const isFarAway = latDiff > 2 || lngDiff > 2;

    if (isFarAway) {
      mapRef.current.setZoom(7);
      setTimeout(() => { if (mapRef.current) mapRef.current.panTo(center); }, 300);
      setTimeout(() => { if (mapRef.current) mapRef.current.setZoom(zoom); }, 800);
    } else {
      mapRef.current.panTo(center);
      setTimeout(() => { if (mapRef.current) mapRef.current.setZoom(zoom); }, 500);
    }
  }, [center, zoom, mapLoaded]);

  const formatPrice = (price) => {
    if (!price || isNaN(price)) return 'Price on request';
    const n = Number(price);
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  const capitalizeFirst = (value) => {
    if (!value || typeof value !== 'string') return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const getMarkerColor = (status) => {
    const normalized = String(status || '').toLowerCase().replace(/[\s_-]/g, '');
    if (normalized === 'nilbooking' || normalized === 'nil' || normalized === 'available') return '#22c55e';
    if (normalized === 'onbooking') return '#f59e0b';
    if (normalized === 'sold' || normalized === 'rented' || normalized === 'booked') return '#ef4444';
    return '#3b82f6';
  };

  const createMarkerIcon = (color) => ({
    url: `data:image/svg+xml,%3Csvg width='24' height='36' viewBox='0 0 28 42' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14 0C6.82 0 1 5.82 1 13c0 9.75 13 29 13 29s13-19.25 13-29C27 5.82 21.18 0 14 0z' fill='${encodeURIComponent(color)}'/%3E%3Ccircle cx='14' cy='13' r='6' fill='%23ffffff'/%3E%3C/svg%3E`,
    scaledSize: { width: 24, height: 36 },
    anchor: { x: 12, y: 36 },
  });

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    setMapLoaded(true);
  }, []);

  const clearHidePopupTimer = () => {
    if (hidePopupTimeoutRef.current) {
      clearTimeout(hidePopupTimeoutRef.current);
      hidePopupTimeoutRef.current = null;
    }
  };

  const scheduleHidePopup = () => {
    clearHidePopupTimer();
    hidePopupTimeoutRef.current = setTimeout(() => setHoveredProperty(null), 180);
  };

  useEffect(() => () => clearHidePopupTimer(), []);

  const infoWindowOptions = { pixelOffset: { width: 0, height: -30 }, maxWidth: 300, disableAutoPan: true };

  const renderPopupContent = (property) => {
    const isRent = !!property.rent_amount;
    const saleType = (property.sale_type || '').toLowerCase();
    const isPlotOrFlat = ['plot', 'flat'].includes(saleType);
    const landmark = property.street_name_or_road_name || '';
    const locationStr = landmark || [property.village_name, property.taluk_name].filter(Boolean).join(', ') || 'Location available';

    return (
      <div
        className="popup-content popup-clickable"
        onClick={() => router.push(getPropertyHref(property))}
      >
        <div className="popup-id-badge">{property.formatted_id || 'Property'}</div>

        <div className="popup-price">
          {isRent ? formatPrice(property.rent_amount) : formatPrice(property.sale_price)}
          {isRent && <span className="price-period">/mo</span>}
        </div>

        <div className="popup-details-grid">
          {isRent ? (
            <>
              {property.advance_amount && (
                <div className="detail-item">
                  <span className="detail-label">Advance</span>
                  <span className="detail-value">{formatPrice(property.advance_amount)}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Type</span>
                <span className="detail-value">
                  {(property.property_use || '').toLowerCase() === 'commercial'
                    ? 'Commercial'
                    : `${property.bhk || ''} BHK`.trim() || 'Residential'}
                </span>
              </div>
            </>
          ) : isPlotOrFlat ? (
            <>
              {property.title && (
                <div className="detail-item">
                  <span className="detail-label">Layout</span>
                  <span className="detail-value">{property.title}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Type</span>
                <span className="detail-value">{capitalizeFirst(saleType)}</span>
              </div>
            </>
          ) : (
            <>
              {property.extent_area && (
                <div className="detail-item">
                  <span className="detail-label">Area</span>
                  <span className="detail-value">{[property.extent_area, property.extent_unit].filter(Boolean).join(' ')}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Type</span>
                <span className="detail-value">{capitalizeFirst(saleType) || 'Property'}</span>
              </div>
            </>
          )}
        </div>

        <div className="popup-location">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{locationStr}</span>
        </div>

        <div className="popup-view-link">View Details →</div>
      </div>
    );
  };

  if (!isLoaded) return <div className="unified-map-loading">Loading Map...</div>;

  return (
    <div className="unified-map-container">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
        }}
      >
        {properties.map((property, index) => {
          const lat = Number(property.latitude);
          const lng = Number(property.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          const isRent = !!property.rent_amount;
          const statusValue = isRent ? property.rent_status : property.sale_status;
          const color = getMarkerColor(statusValue);

          return (
            <Marker
              key={property.property_id || index}
              position={{ lat, lng }}
              icon={createMarkerIcon(color)}
              onMouseOver={() => { clearHidePopupTimer(); setHoveredProperty(property); }}
              onMouseOut={scheduleHidePopup}
              onClick={() => { clearHidePopupTimer(); setHoveredProperty(property); }}
            />
          );
        })}

        {hoveredProperty && (
          <InfoWindow
            position={{ lat: Number(hoveredProperty.latitude), lng: Number(hoveredProperty.longitude) }}
            onCloseClick={() => setHoveredProperty(null)}
            options={infoWindowOptions}
          >
            <div onMouseEnter={clearHidePopupTimer} onMouseLeave={scheduleHidePopup}>
              {renderPopupContent(hoveredProperty)}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default UnifiedMap;
