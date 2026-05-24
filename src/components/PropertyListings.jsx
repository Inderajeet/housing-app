'use client';

import React, { useMemo } from 'react';
import PropertyCard from './PropertyCard';
import ListingFilterBar from './ListingFilterBar';
import '../styles/PropertyListings.css';

const PropertyListings = ({
  properties,
  totalCount,
  isSidePanel,
  filters = {},
  handleFilterChange = () => {},
}) => {
  const locationDisplayName =
    [filters.village, filters.taluk, filters.district].filter(Boolean).join(', ') || 'Tamil Nadu';

  const displayedProperties = useMemo(() => properties, [properties]);

  if (displayedProperties.length === 0) {
    return (
      <div className={isSidePanel ? 'no-properties' : 'general-listings-section full-width-section'}>
        {!isSidePanel && (
          <ListingFilterBar
            filters={filters}
            handleFilterChange={handleFilterChange}
            totalCount={0}
            locationDisplayName={locationDisplayName}
          />
        )}
        <div className="no-properties-general">
          <p>No properties found in {locationDisplayName}.</p>
          <button
            className="reset-filters-btn"
            onClick={() => handleFilterChange({ bhk: [], minPrice: 0, maxPrice: 100000000 })}
          >
            Reset Filters
          </button>
        </div>
      </div>
    );
  }

  const containerClass = isSidePanel ? 'side-view' : 'general-view';

  return (
    <div className={`property-listings-container ${containerClass}`}>
      {!isSidePanel && (
        <ListingFilterBar
          filters={filters}
          handleFilterChange={handleFilterChange}
          totalCount={totalCount}
          locationDisplayName={locationDisplayName}
        />
      )}

      <div className="listings-grid-wrapper">
        {displayedProperties.map((property) => (
          <PropertyCard
            key={property.property_id || property.id}
            property={property}
            dynamicBHK={property.bhk}
            dynamicType={property.property_type}
          />
        ))}
      </div>
    </div>
  );
};

export default PropertyListings;
