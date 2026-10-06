'use client';

import React from 'react';
import { useAppContext } from '../app/AppContext';

// Values/order stay fixed for backend logic; only the rendered label is admin-driven.
const propertyTypes = [
    { label: 'Land', value: 'land' },
    { label: 'House', value: 'house' },
    { label: 'Plot', value: 'plot' },
    { label: 'Flat', value: 'flat' },
];

const areaUnits = [
    { label: 'Sqft', value: 'sqft' },
    { label: 'Cent', value: 'cent' },
    { label: 'Acre', value: 'acre' },
    { label: 'Sqm', value: 'sqm' },
];

// Types that get the small "Individual" tag on top
const individualTypes = ['land', 'house'];

const labelFor =(options, value) => options?.find(o => o.option_key === value)?.label || '';

const SalePropertyForm = ({ data, onChange, onSubmit, config }) => {
    const { locale } = useAppContext();
    const propertyTypeOptions = config?.options?.property_type;
    const areaUnitOptions = config?.options?.area_unit;
    const fields = config?.fields || {};
    const canSubmit = data.saleType && data.area_value && data.area_unit && (data.rate_sqft || data.rate_cent);

    return (
        <div className="modal-content property-form sale-form">
            {/* Property Details */}
            <h2>{config?.header || ''}</h2>

            <div className="form-group">
                {/* Type */}
                <label>{fields.typeLabel || ''}</label>
                <div className="option-group sale-type-group">
                    {propertyTypes.map(t => (
                        <button key={t.value} type="button" className={`option-btn ${data.saleType === t.value ? 'active' : ''}`} onClick={() => onChange('saleType', t.value)}>
                            {individualTypes.includes(t.value) && <span className="option-btn-tag">{locale === 'en' ? 'Ind' : 'தனி'}</span>}
                            <span>{labelFor(propertyTypeOptions, t.value)}</span>
                        </button>
                    ))}
                </div>
            </div>

            {data.saleType === 'flat' && (
                <div className="form-group">
                    {/* Floor No. */}
                    <label>{fields.floorLabel || ''}</label>
                    <input
                        type="text"
                        value={data.floorNo || ''}
                        onChange={(e) => onChange('floorNo', e.target.value)}
                        className="input-field"
                        placeholder={fields.floorPlaceholder || ''}
                    />
                </div>
            )}

            <div className="form-group">
                {/* Area */}
                <label>{fields.areaLabel || ''}</label>
                <div className="input-with-options">
                    <input
                        type="number"
                        inputMode="decimal"
                        value={data.area_value || ''}
                        onChange={(e) => onChange('area_value', e.target.value)}
                        className="input-field input-field-narrow"
                        placeholder={fields.areaPlaceholder || ''}
                    />
                    <div className="option-group sale-unit-group">
                        {areaUnits.map(u => (
                            <button key={u.value} type="button" className={`option-btn ${data.area_unit === u.value ? 'active' : ''}`} onClick={() => onChange('area_unit', u.value)}>{labelFor(areaUnitOptions, u.value)}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="form-group">
                {/* Rate */}
                <label>{fields.rateLabel || ''}</label>
                <div className="rate-unit-group">
                    <div className="rate-unit-item">
                        <span className="rate-unit-prefix">1 sqft =</span>
                        <input
                            type="number"
                            inputMode="decimal"
                            value={data.rate_sqft || ''}
                            onChange={(e) => onChange('rate_sqft', e.target.value)}
                            className="input-field input-field-narrow"
                            placeholder={fields.ratePlaceholder || ''}
                        />
                    </div>
                    <span className="rate-or">(or)</span>
                    <div className="rate-unit-item">
                        <span className="rate-unit-prefix">1 cent =</span>
                        <input
                            type="number"
                            inputMode="decimal"
                            value={data.rate_cent || ''}
                            onChange={(e) => onChange('rate_cent', e.target.value)}
                            className="input-field input-field-narrow"
                            placeholder={fields.ratePlaceholder || ''}
                        />
                    </div>
                </div>
            </div>

            <div className="modal-actions full-width-center">
                {/* OK */}
                <button type="button" onClick={onSubmit} disabled={!canSubmit} className="primary-button save-and-continue">{config?.button || ''}</button>
            </div>
        </div>
    );
};

export default SalePropertyForm;
