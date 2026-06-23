'use client';

import React, { useState, useCallback } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import '../styles/Modal.css';
import { endpoints } from '../api/api';
import RentPropertyForm from './RentPropertyForm';
import SalePropertyForm from './SalePropertyForm';
import LiveLocationModal from './LiveLocationModal';

const STEPS = [
    { id: 1, name: 'Contact' },
    { id: 2, name: 'Location Proof' },
    { id: 3, name: 'Property Details' },
    { id: 4, name: 'Additional Details' },
];

const FIELD_WEIGHTS = {
    number: 10, latitude: 10, liveImage: 10,
    rent_propertyType: 5, rent_bhk: 5, rent_extent: 5, rent_rentAmount: 5, rent_advanceAmount: 5,
    sale_propertyType: 5, sale_price: 10, sale_survey_number: 5, sale_documents: 5,
    district: 5, taluk: 5, village: 5, street_name_or_road_name: 5, mediaFiles: 15,
};

const calculateProgress = (data) => {
    let score = 0;
    let maxScore = 0;

    if (data.number && data.number.length === 10) score += FIELD_WEIGHTS.number;
    if (data.latitude) score += FIELD_WEIGHTS.latitude;
    if (data.liveImage) score += FIELD_WEIGHTS.liveImage;
    if (data.district) score += FIELD_WEIGHTS.district;
    if (data.taluk) score += FIELD_WEIGHTS.taluk;
    if (data.village) score += FIELD_WEIGHTS.village;
    if (data.street_name_or_road_name) score += FIELD_WEIGHTS.street_name_or_road_name;
    if (data.mediaFiles && data.mediaFiles.length > 0) score += FIELD_WEIGHTS.mediaFiles;

    if (data.transactionType === 'rent') {
        if (data.propertyType) score += FIELD_WEIGHTS.rent_propertyType;
        if (data.propertyType === 'Residential' && data.bhk) score += FIELD_WEIGHTS.rent_bhk;
        if (data.propertyType === 'Commercial' && data.extent_area && data.extent_unit) score += FIELD_WEIGHTS.rent_extent;
        if (data.rentAmount) score += FIELD_WEIGHTS.rent_rentAmount;
        if (data.advanceAmount) score += FIELD_WEIGHTS.rent_advanceAmount;
    } else if (data.transactionType === 'sale') {
        if (data.saleType) score += FIELD_WEIGHTS.sale_propertyType;
        if (data.price) score += FIELD_WEIGHTS.sale_price;
        if (data.survey_number) score += FIELD_WEIGHTS.sale_survey_number;
        if (data.allDocuments.length > 0 || data.drawings.length > 0 || data.brochure.length > 0) score += FIELD_WEIGHTS.sale_documents;
        maxScore =
            FIELD_WEIGHTS.number + FIELD_WEIGHTS.latitude + FIELD_WEIGHTS.liveImage +
            FIELD_WEIGHTS.sale_propertyType + FIELD_WEIGHTS.sale_price + FIELD_WEIGHTS.sale_survey_number +
            FIELD_WEIGHTS.sale_documents + FIELD_WEIGHTS.district + FIELD_WEIGHTS.taluk +
            FIELD_WEIGHTS.village + FIELD_WEIGHTS.street_name_or_road_name + FIELD_WEIGHTS.mediaFiles;
    }

    if (maxScore === 0) maxScore = 100;
    return Math.min(100, Math.round((score / maxScore) * 100));
};

const ProgressBar = ({ currentStep }) => {
    const totalSteps = STEPS.length;
    const stepWidth = ((currentStep - 1) / (totalSteps - 1)) * 100 || 0;
    return (
        <div className="progress-bar-container">
            <div className="step-indicators">
                <div className="progress-bar-line">
                    <div className="progress-fill" style={{ width: `${stepWidth}%` }} />
                </div>
                {STEPS.map((step, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = stepNumber < currentStep;
                    const isActive = stepNumber === currentStep;
                    return (
                        <div key={step.id} className={`step-dot ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                            {isCompleted ? 'OK' : ''}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const NumberCaptureModal = ({ data, onChange, onNext }) => (
    <div className="modal-content">
        <p>Please enter your number to get started. It will not be visible to the public.</p>
        <div className="form-group">
            <label>{data.transactionType === 'rent' ? 'Owner Number' : 'Seller Number'}</label>
            <input
                type="tel"
                placeholder={data.transactionType === 'rent' ? 'Enter owner number' : 'Enter seller number'}
                value={data.number}
                onChange={(e) => onChange('number', e.target.value)}
                maxLength={10}
                className="input-field"
            />
        </div>
        <div className="modal-actions full-width-center">
            <button onClick={onNext} disabled={data.number.length !== 10} className="primary-button">Continue</button>
        </div>
    </div>
);

const initialFormData = {
    number: '', alternate_phone: '', listing_person_number: '', dtcp: '', latitude: '', longitude: '', address: '', liveImage: '',
    transactionType: 'rent', propertyType: 'Residential', bhk: '', rentAmount: '', advanceAmount: '',
    premium_requested: false, extent_area: '', extent_unit: '', saleType: '', price: '',
    survey_number: '', area_size: '', street_name_or_road_name: '',
    boundary_north: '', boundary_south: '', boundary_east: '', boundary_west: '',
    total_units_count: '', booked_units: '', open_units: '',
    allDocuments: [], drawings: [], brochure: [],
    district: '', taluk: '', village: '', mediaFiles: [],
};

const PostPropertyFlow = ({ onClose, initialTransactionType = 'rent', onSuccessfulPost }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [ownerNotice, setOwnerNotice] = useState(null);
    const [saleError, setSaleError] = useState('');
    const [formData, setFormData] = useState(() => ({
        ...initialFormData,
        property_id: null,
        transactionType: initialTransactionType.toLowerCase() === 'sale' ? 'sale' : 'rent',
    }));

    const progressPercent = calculateProgress(formData);

    const handleDataChange = useCallback((key, value) => {
        setFormData((prev) => {
            let newState = { ...prev, [key]: value };
            if (key === 'district') newState = { ...newState, taluk: '', village: '' };
            if (key === 'taluk') newState = { ...newState, village: '' };
            return newState;
        });
        if (key === 'number') setOwnerNotice(null);
        if (key === 'dtcp') setSaleError('');
    }, []);

    const resolveAddressFromCoordinates = useCallback(async (latitude, longitude) => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API;
        if (!latitude || !longitude || !apiKey) return '';
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
            );
            const result = await response.json();
            return result?.results?.[0]?.formatted_address || '';
        } catch {
            return '';
        }
    }, []);

    const handleNext = useCallback(async () => {
        if (currentStep === 2) {
            setLoading(true);
            setLoadingMessage('Preparing property details...');
            try {
                const resolvedAddress =
                    formData.address ||
                    await resolveAddressFromCoordinates(formData.latitude, formData.longitude);

                if (resolvedAddress && resolvedAddress !== formData.address) {
                    handleDataChange('address', resolvedAddress);
                }

                const payload = {
                    contact_phone: formData.number,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    address: resolvedAddress || null,
                    property_type: formData.transactionType,
                };

                const response = await endpoints.createProperty(formData.transactionType, payload);
                const propertyId = response.data.property_id;
                handleDataChange('property_id', propertyId);

                if (formData.liveImage) {
                    setLoadingMessage('Uploading live photo...');
                    const fetchResponse = await fetch(formData.liveImage);
                    const blob = await fetchResponse.blob();
                    const liveFormData = new FormData();
                    liveFormData.append('file', blob, 'live_image.jpg');
                    liveFormData.append('asset_type', 'image');
                    await endpoints.uploadAsset(propertyId, liveFormData);
                }

                setCurrentStep(3);
            } catch (err) {
                alert('Failed to initialize property. Please try again');
            } finally {
                setLoading(false);
                setLoadingMessage('');
            }
            return;
        }

        setLoading(true);
        setLoadingMessage('');
        setTimeout(async () => {
            if (currentStep === 1 && formData.transactionType === 'rent' && formData.number?.length === 10) {
                try {
                    const ownerLookup = await endpoints.checkRentOwner(formData.number);
                    if (ownerLookup.data?.exists) {
                        setOwnerNotice({
                            phone: ownerLookup.data.phone_number || formData.number,
                            message: 'This owner number is already linked to an existing property listing.',
                        });
                        setLoading(false);
                        return;
                    } else {
                        setOwnerNotice(null);
                    }
                } catch {
                    setOwnerNotice(null);
                }
            }
            setCurrentStep((prev) => prev + 1);
            setLoading(false);
            setLoadingMessage('');
        }, 250);
    }, [currentStep, formData, handleDataChange, resolveAddressFromCoordinates]);

    const submitProperty = async ({ advanceToAdditional = false } = {}) => {
        setLoading(true);
        setLoadingMessage(advanceToAdditional ? 'Posting your property...' : 'Updating property details...');

        try {
            let payload = {
                district_id: formData.district_id,
                taluk_id: formData.taluk_id,
                village_id: formData.village_id,
                street_name_or_road_name: formData.street_name_or_road_name,
                premium_requested: formData.premium_requested === true,
                alternate_contact_phone: formData.transactionType === 'rent'
                    ? (formData.listing_person_number || formData.alternate_phone || null)
                    : (formData.alternate_phone || null),
                listing_person_phone: formData.listing_person_number || null,
                dtcp: formData.dtcp || null,
                latitude: formData.latitude || null,
                longitude: formData.longitude || null,
                address: formData.address || null,
                live_image: formData.liveImage || null,
            };

            if (formData.transactionType === 'rent') {
                payload = {
                    ...payload,
                    property_use: formData.propertyType,
                    bhk: formData.propertyType === 'Residential' ? formData.bhk : null,
                    rent_amount: formData.rentAmount,
                    advance_amount: formData.advanceAmount,
                    extent_area: formData.extent_area || null,
                    extent_unit: formData.extent_unit || null,
                };
            } else {
                if (!String(formData.dtcp || '').trim()) {
                    alert('DTCP number is required for sale listings.');
                    return;
                }
                payload = {
                    ...payload,
                    sale_type: formData.saleType,
                    price: formData.price,
                    rate_unit: formData.rate_unit || null,
                    survey_number: formData.survey_number,
                    area_size: formData.area_size || null,
                    extension: formData.extension || null,
                    boundary_north: formData.boundary_north,
                    boundary_south: formData.boundary_south,
                    boundary_east: formData.boundary_east,
                    boundary_west: formData.boundary_west,
                    total_units_count: formData.total_units_count,
                    booked_units: formData.booked_units,
                    open_units: formData.open_units,
                };
            }

            await endpoints.updateProperty(formData.transactionType, formData.property_id, payload);

            if (advanceToAdditional) {
                alert('Property info saved.\n\nYou can now add any additional details and update the listing.');
                setCurrentStep(4);
            } else {
                onSuccessfulPost(formData.number);
            }
        } catch (err) {
            if (err?.response?.data?.code === 'DTCP_EXISTS') {
                setSaleError('This DTCP number already exists for another property. Please enter a different number or close this form.');
                return;
            }
            alert('Failed to post property details. Please check your connection.');
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    let stepComponent;
    switch (currentStep) {
        case 1:
            stepComponent = <NumberCaptureModal data={formData} onChange={handleDataChange} onNext={handleNext} />;
            break;
        case 2:
            stepComponent = <LiveLocationModal data={formData} onChange={handleDataChange} onNext={handleNext} />;
            break;
        case 3:
            stepComponent = formData.transactionType === 'rent' ? (
                <RentPropertyForm data={formData} onChange={handleDataChange} onNext={() => submitProperty({ advanceToAdditional: true })} onSubmit={() => submitProperty({ advanceToAdditional: false })} mode="details" />
            ) : (
                <SalePropertyForm data={formData} onChange={handleDataChange} onNext={() => submitProperty({ advanceToAdditional: true })} onSubmit={() => submitProperty({ advanceToAdditional: false })} mode="details" validationError={saleError} />
            );
            break;
        case 4:
            stepComponent = formData.transactionType === 'rent' ? (
                <RentPropertyForm data={formData} onChange={handleDataChange} onSubmit={() => submitProperty({ advanceToAdditional: false })} mode="additional" />
            ) : (
                <SalePropertyForm data={formData} onChange={handleDataChange} onSubmit={() => submitProperty({ advanceToAdditional: false })} mode="additional" validationError={saleError} />
            );
            break;
        default:
            stepComponent = null;
    }

    return (
        <div className="modal-overlay">
            <div
                className={`post-property-modal post-property-shell ${loading ? 'is-loading' : ''}`}
                data-progress={progressPercent}
            >
                {loading && (
                    <div className="modal-loading-overlay">
                        <div className="modal-loading-card">
                            <div className="modal-spinner" />
                            {loadingMessage ? <p>{loadingMessage}</p> : null}
                        </div>
                    </div>
                )}
                {ownerNotice && formData.transactionType === 'rent' && (
                    <div className="modal-loading-overlay">
                        <div className="modal-loading-card" style={{ gap: '12px', textAlign: 'center', maxWidth: '320px' }}>
                            <FaWhatsapp size={32} style={{ color: '#16a34a', margin: '0 auto' }} />
                            <p style={{ fontWeight: 600, fontSize: '15px', marginBottom: 0 }}>Number Already Registered</p>
                            <p style={{ fontSize: '13px', color: '#555', marginBottom: 0 }}>{ownerNotice.message}</p>
                            <p style={{ fontSize: '12px', color: '#777', marginBottom: 0 }}>Please connect with our team on WhatsApp for assistance.</p>
                            <a
                                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '918220008733'}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="primary-button"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#16a34a', textDecoration: 'none', justifyContent: 'center' }}
                            >
                                <FaWhatsapp size={14} />
                                Chat on WhatsApp
                            </a>
                            <button
                                onClick={() => { setOwnerNotice(null); handleDataChange('number', ''); }}
                                style={{ background: 'none', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', color: '#555' }}
                            >
                                Re-enter Number
                            </button>
                        </div>
                    </div>
                )}
                <div className="modal-header">
                    <ProgressBar currentStep={currentStep} />
                    <button className="close-button" onClick={onClose} aria-label="Close">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                {stepComponent}
            </div>
        </div>
    );
};

export default PostPropertyFlow;
