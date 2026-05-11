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
  const isPlotOrFlat = ['plot', 'flat'].includes(saleType);
  const salePriceFormatted = formatPrice(property.sale_price || property.price);
  const priceStr = isRent
    ? (formatPrice(property.rent_amount) ? `${formatPrice(property.rent_amount)}/mo` : null)
    : salePriceFormatted
      ? `${salePriceFormatted}${property.rate_unit ? `/${property.rate_unit}` : ''}`
      : null;

  // Primary label: layout name for plot/flat, landmark for house/land/rent
  const landmark = property.street_name_or_road_name || property.landmark || property.street_name || '';

  let primaryLabel = null;
  let secondaryLabel = property.formatted_id || 'Property';

  if (isPlotOrFlat) {
    // Plot/flat: show layout name first, then formatted_id
    primaryLabel = property.title || property.layout_name || null;
  } else {
    // House/land/rent: show landmark first if available
    primaryLabel = landmark || null;
  }

  // BHK badge for rent
  const bhkLabel = isRent && property.bhk ? `${property.bhk} BHK` : null;

  return (
    <Link className="compact-property-card" href={getPropertyHref(property)}>
      <div className="card-details-section">
        <div className="title-row">
          {primaryLabel
            ? <>
                <p className="property-title">{primaryLabel}</p>
                <p className="bhk-details-text">{secondaryLabel}</p>
              </>
            : <p className="property-title">{secondaryLabel}</p>
          }
          {bhkLabel && <p className="bhk-details-text">{bhkLabel}</p>}
        </div>
        {priceStr && <p className="property-price-text">{priceStr}</p>}
      </div>
    </Link>
  );
};

export default PropertyCard;
