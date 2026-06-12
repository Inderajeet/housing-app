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
    const landmark = property.street_name_or_road_name || property.landmark || property.street_name || '';
    const layoutName = property.title || property.layout_name || '';
    const layoutOrLandmark = layoutName || landmark || '';

    // If layout name is in line 2, location shows landmark → village → taluk → district
    // If landmark is in line 2 (no layout name), location shows broader area only
    const locationStr = layoutName
      ? (landmark || [property.village_name, property.taluk_name].filter(Boolean).join(', ') || property.district_name || '')
      : ([property.village_name, property.taluk_name].filter(Boolean).join(', ') || property.district_name || '');

    const idPart = property.formatted_id || '';
    const typePart = isRent
      ? ((property.property_use || '').toLowerCase() === 'commercial' ? 'commercial' : property.bhk ? `${property.bhk}BHK` : 'residential')
      : (saleType || 'property');
    const ratePart = isRent ? formatPrice(property.rent_amount) : formatPrice(property.sale_price || property.price);
    const rateWithUnit = isRent
      ? (ratePart ? `${ratePart}/mo` : '')
      : (property.rate_unit && ratePart ? `${ratePart}/${property.rate_unit}` : ratePart || '');
    const extentPart = [property.extension, property.area_size].filter(Boolean).join(' ');
    const thirdLine = [idPart, typePart, rateWithUnit, extentPart].filter(Boolean).join(' / ');

    const areaSalesSpeed = property.area_sales_speed != null
      ? `${Number(property.area_sales_speed).toFixed(1)}/mo`
      : property.area_speed != null
        ? `${Number(property.area_speed).toFixed(1)}/mo`
        : '—';

    return (
      <div
        className="popup-content popup-clickable"
        style={{ position: 'relative' }}
        onClick={() => router.push(getPropertyHref(property))}
      >
        <button
          className="popup-close-btn"
          onClick={(e) => { e.stopPropagation(); setHoveredProperty(null); }}
          aria-label="Close"
        >✕</button>

        <div className="popup-location">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{locationStr}</span>
        </div>

        {layoutOrLandmark && (
          <div className="popup-layout-name">{layoutOrLandmark}</div>
        )}

        {thirdLine && (
          <div className="popup-info-line">{thirdLine}</div>
        )}

        <div className={`popup-ratings-grid${isRent ? ' popup-ratings-grid-2col' : ''}`}>
          {!isRent && (
            <>
              <div className="popup-rating-item">
                <span className="popup-rating-label">Legal</span>
                <span className="popup-rating-sublabel">rating</span>
                <span className="popup-rating-value">{property.legal_value ?? '—'}</span>
              </div>
              <div className="popup-rating-item">
                <span className="popup-rating-label">Area Sales</span>
                <span className="popup-rating-sublabel">speed</span>
                <span className="popup-rating-value">{areaSalesSpeed}</span>
              </div>
            </>
          )}
          <div className="popup-rating-item">
            <span className="popup-rating-label">Amenities</span>
            <span className="popup-rating-sublabel">rating</span>
            <span className="popup-rating-value">
              {property.amenities_rating != null ? Number(property.amenities_rating).toFixed(1) : '—'}
            </span>
          </div>
          <div className="popup-rating-item">
            <span className="popup-rating-label">Location</span>
            <span className="popup-rating-sublabel">score</span>
            <span className="popup-rating-value">
              {property.utilities_rating != null ? Number(property.utilities_rating).toFixed(1) : '—'}
            </span>
          </div>
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
