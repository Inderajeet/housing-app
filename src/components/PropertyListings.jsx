'use client';

import React, { useMemo, useState } from 'react';
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

  const getSellerName = (p) => p.developer_name || p.seller_name || p.posted_by;
  const [selectedSeller, setSelectedSeller] = useState('ALL');

  const sellerOptions = useMemo(() => {
    const names = properties.map(getSellerName).filter(Boolean);
    return Array.from(new Set(names));
  }, [properties]);

  const displayedProperties = useMemo(() => {
    if (!isSidePanel || selectedSeller === 'ALL') return properties;
    return properties.filter((p) => getSellerName(p) === selectedSeller);
  }, [properties, isSidePanel, selectedSeller]);

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

      {isSidePanel && sellerOptions.length > 0 && (
        <div className="seller-filter-row compact">
          <select
            className="seller-filter-select"
            value={selectedSeller}
            onChange={(e) => setSelectedSeller(e.target.value)}
          >
            <option value="ALL">All sellers</option>
            {sellerOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
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
