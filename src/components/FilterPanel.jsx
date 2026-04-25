'use client';

import React, { useEffect } from 'react';
import '../styles/FilterPanel.css';

const formatDisplayPrice = (price) => {
    if (price === 0) return 'Min Price';
    if (price === 100000000) return '₹ 10 Cr+';
    if (price >= 10000000) return `₹ ${(price / 10000000).toFixed(1)} Cr`;
    if (price >= 100000) return `₹ ${(price / 100000).toFixed(1)} Lac`;
    return price.toLocaleString();
};

const FilterPanel = ({ filters, onFilterChange, onApply, onClose, isModal }) => {

    useEffect(() => {
        document.body.classList.toggle('modal-open', isModal);
        return () => document.body.classList.remove('modal-open');
    }, [isModal]);

    const handleBhkChange = (bhk) => {
        const currentBhks = filters.bhk || [];
        const newBhks = currentBhks.includes(bhk)
            ? currentBhks.filter(b => b !== bhk)
            : [...currentBhks, bhk];
        onFilterChange({ bhk: newBhks });
    };

    const handlePropertyTypeChange = (type) => {
        onFilterChange({ propertyType: filters.propertyType === type ? '' : type });
    };

    const handleResetAdvanced = () => {
        onApply({
            ...filters,
            propertyType: '',
            minPrice: 0,
            maxPrice: 100000000,
            bhk: [],
        });
    };

    if (!isModal) return null;

    return (
        <div className="advanced-filter-modal-overlay">
            <div className="advanced-filter-modal-content">
                <div className="modal-header">
                    <h2>All Filters</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button onClick={handleResetAdvanced} className="reset-button">Reset</button>
                        <button onClick={onClose} className="close-modal-btn">✕</button>
                    </div>
                </div>

                <div className="modal-body">
                    <div className="filter-section">
                        <h3>Price Range</h3>
                        <div className="price-display">
                            <span>Min: {formatDisplayPrice(filters.minPrice)}</span>
                            <span>Max: {formatDisplayPrice(filters.maxPrice)}</span>
                        </div>
                        <div className="price-select-group">
                            <select value={filters.minPrice} onChange={(e) => onFilterChange({ minPrice: parseInt(e.target.value) })}>
                                <option value={0}>Min Price</option>
                                <option value={500000}>5 Lac</option>
                                <option value={1000000}>10 Lac</option>
                            </select>
                            <select value={filters.maxPrice} onChange={(e) => onFilterChange({ maxPrice: parseInt(e.target.value) })}>
                                <option value={100000000}>Max Price</option>
                                <option value={5000000}>50 Lac</option>
                                <option value={10000000}>1 Cr</option>
                            </select>
                        </div>
                    </div>

                    <div className="filter-section">
                        <h3>Property Type</h3>
                        <div className="button-group">
                            {['Apartment', 'Independent House', 'Gated Community'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => handlePropertyTypeChange(type)}
                                    className={`filter-type-button ${filters.propertyType === type ? 'active' : ''}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="filter-section">
                        <h3>BHK Type</h3>
                        <div className="button-group">
                            {['1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK'].map(bhk => (
                                <button
                                    key={bhk}
                                    onClick={() => handleBhkChange(bhk)}
                                    className={`filter-type-button ${filters.bhk.includes(bhk) ? 'active' : ''}`}
                                >
                                    {bhk}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button onClick={handleResetAdvanced} className="clear-btn">Clear All</button>
                    <button onClick={onClose} className="apply-btn">Apply Filters</button>
                </div>
            </div>
        </div>
    );
};

export default FilterPanel;
