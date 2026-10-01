'use client';

import React from 'react';

// Values/order stay fixed for backend logic; only the rendered label is admin-driven.
const typeOptions = [
    { label: '1 BHK', value: '1bhk' },
    { label: '2 BHK', value: '2bhk' },
    { label: '3 BHK+', value: '3bhk' },
    { label: 'Commercial', value: 'commercial' },
];

const labelFor = (options, value) => options?.find(o => o.option_key === value)?.label || '';

const RentPropertyForm = ({ data, onChange, onSubmit, config }) => {
    const roomTypeOptions = config?.options?.room_type;
    const fields = config?.fields || {};
    const canSubmit = data.rentType && data.extent_area && data.rentAmount && data.advanceAmount;

    return (
        <div className="modal-content property-form">
            {/* Property Details */}
            <h2>{config?.header || ''}</h2>

            <div className="form-group">
                {/* Type */}
                <label>{fields.typeLabel || ''}</label>
                <div className="option-group">
                    {typeOptions.map(t => (
                        <button key={t.value} type="button" className={`option-btn ${data.rentType === t.value ? 'active' : ''}`} onClick={() => onChange('rentType', t.value)}>{labelFor(roomTypeOptions, t.value)}</button>
                    ))}
                </div>
            </div>

            <div className="form-group dual-input">
                <div className="dual-input-item">
                    {/* Floor Area */}
                    <label>{fields.areaLabel || ''}</label>
                    <div className="input-with-suffix">
                        <input
                            type="number"
                            inputMode="decimal"
                            value={data.extent_area || ''}
                            onChange={(e) => onChange('extent_area', e.target.value)}
                            className="input-field input-field-narrow"
                            placeholder={fields.areaPlaceholder || ''}
                        />
                        <span className="input-suffix">sqft</span>
                    </div>
                </div>
                <div className="dual-input-item">
                    {/* Floor No. */}
                    <label>{fields.floorLabel || ''}</label>
                    <input
                        type="text"
                        value={data.floorNo || ''}
                        onChange={(e) => onChange('floorNo', e.target.value)}
                        className="input-field input-field-narrow"
                        placeholder={fields.floorPlaceholder || ''}
                    />
                </div>
            </div>

            <div className="form-group dual-input">
                <div className="dual-input-item">
                    {/* Rent (Rs) */}
                    <label>{fields.rentLabel || ''}</label>
                    <input type="number" inputMode="numeric" value={data.rentAmount || ''} onChange={(e) => onChange('rentAmount', e.target.value)} className="input-field input-field-narrow" placeholder={fields.rentPlaceholder || ''} />
                </div>
                <div className="dual-input-item">
                    {/* Advance (Rs) */}
                    <label>{fields.advanceLabel || ''}</label>
                    <input type="number" inputMode="numeric" value={data.advanceAmount || ''} onChange={(e) => onChange('advanceAmount', e.target.value)} className="input-field input-field-narrow" placeholder={fields.advancePlaceholder || ''} />
                </div>
            </div>

            <div className="modal-actions full-width-center">
                {/* OK */}
                <button type="button" onClick={onSubmit} disabled={!canSubmit} className="primary-button save-and-continue">{config?.button || ''}</button>
            </div>
        </div>
    );
};

export default RentPropertyForm;
