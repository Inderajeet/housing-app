'use client';

import React from 'react';
import Link from 'next/link';
import { getPropertyHref } from '../utils/propertyRouting';
import '../styles/PropertyListings.css';

const PropertyCard = ({ property }) => {
  return (
    <Link className="compact-property-card" href={getPropertyHref(property)}>
      <div className="card-details-section">
        <div className="title-row">
          <p className="property-title">{property.formatted_id || 'Property'}</p>
          {property.title ? <p className="bhk-details-text">{property.title}</p> : null}
        </div>
      </div>
    </Link>
  );
};

export default PropertyCard;
