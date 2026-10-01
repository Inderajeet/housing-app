'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import '../styles/Modal.css';
import { endpoints } from '../api/api';
import RentPropertyForm from './RentPropertyForm';
import SalePropertyForm from './SalePropertyForm';
import LiveLocationModal from './LiveLocationModal';
import { useAppContext } from '../app/AppContext';

const STEPS = [
    { id: 1, name: 'Contact' },
    { id: 2, name: 'Location Proof' },
    { id: 3, name: 'Property Details' },
];

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

const NumberCaptureModal = ({ data, onChange, onNext, config }) => {
    // Original English defaults (rent): intro "Please enter your number to get started. It will not be visible to the public.",
    // label "Owner Number", placeholder "Enter owner number", button "OK".
    // Original English defaults (sale): same intro, label "Seller Number", placeholder "Enter seller number", button "OK".
    return (
        <div className="modal-content">
            <p>{config?.contact?.intro || ''}</p>
            <div className="form-group">
                <label>{config?.contact?.label || ''}</label>
                <input
                    type="tel"
                    placeholder={config?.contact?.placeholder || ''}
                    value={data.number}
                    onChange={(e) => onChange('number', e.target.value)}
                    maxLength={10}
                    className="input-field"
                />
            </div>
            <div className="modal-actions full-width-center">
                <button onClick={onNext} disabled={data.number.length !== 10} className="primary-button">{config?.contact?.button || ''}</button>
            </div>
        </div>
    );
};

const initialFormData = {
    number: '', latitude: '', longitude: '', address: '', liveImage: '',
    transactionType: 'rent', rentType: '', extent_area: '', rentAmount: '', advanceAmount: '', floorNo: '',
    saleType: '', area_value: '', area_unit: '', rate_sqft: '', rate_cent: '',
};

const PostPropertyFlow = ({ onClose, initialTransactionType = 'rent', onSuccessfulPost }) => {
    const { locale } = useAppContext();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [ownerNotice, setOwnerNotice] = useState(null);
    const [formData, setFormData] = useState(() => ({
        ...initialFormData,
        property_id: null,
        transactionType: initialTransactionType.toLowerCase() === 'sale' ? 'sale' : 'rent',
    }));
    const [postFlowConfig, setPostFlowConfig] = useState(null);

    useEffect(() => {
        endpoints.getSiteContent(formData.transactionType, locale)
            .then(res => {
                const { headings = {}, flowOptions = {} } = res.data;
                const prefix = formData.transactionType;
                setPostFlowConfig({
                    header: headings[`${prefix}_postflow_header`],
                    button: headings[`${prefix}_postflow_button`],
                    options: {
                        property_type: flowOptions.property_type,
                        area_unit: flowOptions.area_unit,
                        room_type: flowOptions.room_type,
                    },
                    contact: {
                        intro: headings[`${prefix}_postflow_contact_intro`],
                        label: headings[`${prefix}_postflow_contact_label`],
                        placeholder: headings[`${prefix}_postflow_contact_placeholder`],
                        button: headings[`${prefix}_postflow_contact_button`],
                    },
                    location: {
                        header: headings[`${prefix}_postflow_location_header`],
                        intro: headings[`${prefix}_postflow_location_intro`],
                        captureLabel: headings[`${prefix}_postflow_location_capture_label`],
                        captureLabel2: headings[`${prefix}_postflow_location_capture_label2`],
                        button: headings[`${prefix}_postflow_location_button`],
                    },
                    fields: {
                        typeLabel: headings[`${prefix}_postflow_type_label`],
                        areaLabel: headings[`${prefix}_postflow_area_label`],
                        areaPlaceholder: headings[`${prefix}_postflow_area_placeholder`],
                        rateLabel: headings.sale_postflow_rate_label,
                        ratePlaceholder: headings.sale_postflow_rate_placeholder,
                        rentLabel: headings.rent_postflow_rent_label,
                        rentPlaceholder: headings.rent_postflow_rent_placeholder,
                        advanceLabel: headings.rent_postflow_advance_label,
                        advancePlaceholder: headings.rent_postflow_advance_placeholder,
                        floorLabel: headings[`${prefix}_postflow_floor_label`],
                        floorPlaceholder: headings[`${prefix}_postflow_floor_placeholder`],
                    },
                });
            })
            .catch(() => setPostFlowConfig(null));
    }, [formData.transactionType, locale]);

    const handleDataChange = useCallback((key, value) => {
        setFormData((prev) => {
            let newState = { ...prev, [key]: value };
            if (key === 'district') newState = { ...newState, taluk: '', village: '' };
            if (key === 'taluk') newState = { ...newState, village: '' };
            return newState;
        });
        if (key === 'number') setOwnerNotice(null);
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

    const submitProperty = async () => {
        setLoading(true);
        setLoadingMessage('Posting your property...');

        try {
            let payload = {
                contact_phone: formData.number || null,
                latitude: formData.latitude || null,
                longitude: formData.longitude || null,
                address: formData.address || null,
            };

            if (formData.transactionType === 'rent') {
                const isCommercial = formData.rentType === 'commercial';
                payload = {
                    ...payload,
                    property_use: isCommercial ? 'Commercial' : 'Residential',
                    bhk: isCommercial ? null : formData.rentType,
                    floor_no: formData.floorNo || null,
                    rent_amount: formData.rentAmount,
                    advance_amount: formData.advanceAmount,
                    extent_area: formData.extent_area || null,
                    extent_unit: 'sqft',
                };
            } else {
                // Sqft rate wins when both sqft and cent rates are entered
                const rateUnit = formData.rate_sqft ? 'sqft' : 'cent';
                const price = formData.rate_sqft || formData.rate_cent;
                payload = {
                    ...payload,
                    sale_type: formData.saleType,
                    floor_no: formData.saleType === 'flat' ? (formData.floorNo || null) : null,
                    price,
                    rate_unit: rateUnit,
                    area_size: `${formData.area_value} ${formData.area_unit}`,
                };
            }

            await endpoints.updateProperty(formData.transactionType, formData.property_id, payload);
            onSuccessfulPost(formData.number);
        } catch (err) {
            alert('Failed to post property details. Please check your connection.');
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    let stepComponent;
    switch (currentStep) {
        case 1:
            stepComponent = <NumberCaptureModal data={formData} onChange={handleDataChange} onNext={handleNext} config={postFlowConfig} />;
            break;
        case 2:
            stepComponent = <LiveLocationModal data={formData} onChange={handleDataChange} onNext={handleNext} config={postFlowConfig} />;
            break;
        case 3:
            stepComponent = formData.transactionType === 'rent'
                ? <RentPropertyForm data={formData} onChange={handleDataChange} onSubmit={submitProperty} config={postFlowConfig} />
                : <SalePropertyForm data={formData} onChange={handleDataChange} onSubmit={submitProperty} config={postFlowConfig} />;
            break;
        default:
            stepComponent = null;
    }

    return (
        <div className="modal-overlay">
            <div className={`post-property-modal post-property-shell ${loading ? 'is-loading' : ''}`}>
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
