'use client';

import React from 'react';
import Link from 'next/link';
import { getPropertyHref } from '../utils/propertyRouting';
import '../styles/PropertyListings.css';

const formatPrice = (price) => {
  if (price == null || price === '' || Number.isNaN(Number(price)) || Number(price) === 0) return null;
  const n = Number(price);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const PropertyCard = ({ property }) => {
  const isRent = !!property.rent_amount;
  const saleType = (property.sale_type || '').toLowerCase();
  const landmark = property.street_name_or_road_name || property.landmark || property.street_name || '';
  const locationStr = [property.village_name, property.taluk_name].filter(Boolean).join(', ') || landmark || '';
  const layoutOrLandmark = property.title || property.layout_name || landmark || '';

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
    <Link className="compact-property-card" href={getPropertyHref(property)}>
      <div className="card-details-section">
        {locationStr && (
          <div className="card-location">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{locationStr}</span>
          </div>
        )}

        {layoutOrLandmark && (
          <p className="card-layout-name">{layoutOrLandmark}</p>
        )}

        {thirdLine && (
          <p className="card-info-line">{thirdLine}</p>
        )}

        <div className={`card-ratings-grid${isRent ? ' card-ratings-grid-2col' : ''}`}>
          {!isRent && (
            <>
              <div className="card-rating-item">
                <span className="card-rating-label">Legal</span>
                <span className="card-rating-sublabel">rating</span>
                <span className="card-rating-value">{property.legal_value ?? '—'}</span>
              </div>
              <div className="card-rating-item">
                <span className="card-rating-label">Area Sales</span>
                <span className="card-rating-sublabel">speed</span>
                <span className="card-rating-value">{areaSalesSpeed}</span>
              </div>
            </>
          )}
          <div className="card-rating-item">
            <span className="card-rating-label">Amenities</span>
            <span className="card-rating-sublabel">rating</span>
            <span className="card-rating-value">
              {property.amenities_rating != null ? Number(property.amenities_rating).toFixed(1) : '—'}
            </span>
          </div>
          <div className="card-rating-item">
            <span className="card-rating-label">Utilities</span>
            <span className="card-rating-sublabel">rating</span>
            <span className="card-rating-value">
              {property.utilities_rating != null ? Number(property.utilities_rating).toFixed(1) : '—'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PropertyCard;
