'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import { ChevronLeft } from 'lucide-react';
import '../styles/BookingFlow.css';
import '../styles/OurServices.css';
import { endpoints } from '../api/api';
import UnitSelector from './UnitSelector';

const BookingFlow = ({
  propertyId,
  transactionType,
  saleType,
  bookedPeopleCount: bookedPeopleCountProp,
  onStatusChange,
}) => {
  const [serviceRows, setServiceRows] = useState([]);
  const [offerPoints, setOfferPoints] = useState([]);
  const [headings, setHeadings] = useState({});
  const [advantagePoints, setAdvantagePoints] = useState({ sale_tick: [], sale_cross: [], rent_tick: [], rent_cross: [] });

  const [steps, setSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [generalIndex, setGeneralIndex] = useState(null);
  const [generalStatus, setGeneralStatus] = useState(null);
  const [phone, setPhone] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loadingStage, setLoadingStage] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [modalMsg, setModalMsg] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [skipUnitSelection, setSkipUnitSelection] = useState(false);
  const [refreshLayoutKey, setRefreshLayoutKey] = useState(0);
  const [generalRefreshKey, setGeneralRefreshKey] = useState(0);

  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => { onStatusChangeRef.current = onStatusChange; });

  const normalizedSaleType = (saleType || '').toLowerCase();
  const normalizedTransactionType = (transactionType || '').toLowerCase();
  const resolvedUnitType = selectedUnit
    ? (normalizedSaleType || normalizedTransactionType || 'property')
    : (normalizedTransactionType || 'property');

  const isSalePlotOrFlat =
    transactionType === 'sale' &&
    ['plot', 'flat'].includes((saleType || '').toLowerCase());

  const selectedUnitLabel = normalizedSaleType === 'flat' ? 'Selected Flat' : 'Selected Plot';
  const selectedUnitName =
    selectedUnit?.formatted_id ||
    selectedUnit?.flat_number ||
    selectedUnit?.plot_number ||
    selectedUnit?.display_name;

  const updateGeneralFlowState = (data) => {
    const nextStatus = data?.overallStatus ?? null;
    const normalizedOverallStatus = (nextStatus || '').toLowerCase();
    setGeneralIndex(data?.overallStageIndex ?? -1);
    setGeneralStatus(nextStatus);

    if (onStatusChangeRef.current) {
      const isRent = transactionType === 'rent';
      const finalStatus = normalizedOverallStatus === 'closed'
        ? (isRent ? 'RENTED' : 'SOLD')
        : ['confirmed', 'unregistered', 'registered', 'token_paid', 'advance_paid'].includes(normalizedOverallStatus)
          ? 'CONFIRMED'
          : ['on_booking', 'booked'].includes(normalizedOverallStatus)
            ? 'ON_BOOKING'
            : 'Nil Booking';
      onStatusChangeRef.current(finalStatus);
    }

    if (normalizedOverallStatus === 'closed') {
      setIsFinalized(true);
      setIsSubmitted(false);
      return;
    }
    setIsFinalized(false);
  };

  useEffect(() => {
    const type = transactionType === 'rent' ? 'rent' : 'sale';
    endpoints.getSiteContent(type)
      .then(res => {
        const { stages = [], services = {}, offerPoints: op = [], headings: h = {} } = res.data;
        setSteps(stages.map(s => ({
          id: s.stage_key,
          title: s.title,
          subtitle: s.subtitles.map(sub => sub.subtitle_text),
          points: s.points.map(pt => pt.point_text),
          timeframe: s.timeframe,
          nextLabel: s.next_label,
        })));
        const rows = Object.entries(services).map(([stageKey], idx) => ({
          id: `stage-${idx + 1}`,
          stageKey,
          services: services[stageKey],
        }));
        setServiceRows(rows);
        setOfferPoints(op);
        setHeadings(h);
        setAdvantagePoints(res.data.advantagePoints || { sale_tick: [], sale_cross: [], rent_tick: [], rent_cross: [] });
      })
      .catch(() => {
        const flowFile = transactionType === 'rent' ? '/data/rentbookingFlow.json' : '/data/salebookingFlow.json';
        fetch(flowFile).then(r => r.json()).then(data => setSteps(data.stages)).catch(() => {});
      });
  }, [transactionType]);

  useEffect(() => {
    setSkipUnitSelection(false);
    setSelectedUnit(null);
  }, [propertyId, saleType, transactionType]);

  // Reset reminder modal when user picks a new unit so it doesn't flash on unit selection
  useEffect(() => {
    if (selectedUnit) {
      setShowReminderModal(false);
      setModalMsg('');
    }
  }, [selectedUnit]);

  useEffect(() => {
    const loadGeneralFlow = async () => {
      if (isSalePlotOrFlat && !selectedUnit) return;
      try {
        const unitId = selectedUnit
          ? selectedUnit.plot_unit_id || selectedUnit.flat_unit_id
          : propertyId;
        const res = await endpoints.getGeneralBookingFlow({ propertyId, unitType: resolvedUnitType, unitId });
        updateGeneralFlowState(res.data);
      } catch {
      }
    };
    loadGeneralFlow();
  }, [propertyId, selectedUnit, resolvedUnitType, transactionType, generalRefreshKey]);

  const checkStageByPhone = async () => {
    if (phone.length !== 10) return;
    if (isSalePlotOrFlat && !selectedUnit) return;
    try {
      setLoadingStage(true);
      const unitId = selectedUnit
        ? selectedUnit.plot_unit_id || selectedUnit.flat_unit_id
        : propertyId;
      const res = await endpoints.getBookingFlowByPhone({ propertyId, unitType: resolvedUnitType, unitId, phone });

      if (
        generalStatus &&
        ['token_paid', 'advance_paid', 'closed'].includes(generalStatus) &&
        res.data.status !== generalStatus
      ) {
        alert("Sorry, another buyer has already confirmed this unit.");
        return;
      }

      const lastCompletedIndex = res.data.currentIndex ?? -1;
      let nextIndex;
      if (lastCompletedIndex === -1) {
        nextIndex = 0;
      } else {
        nextIndex = lastCompletedIndex + 1 < steps.length ? lastCompletedIndex + 1 : lastCompletedIndex;
      }
      setCurrentStepIndex(nextIndex);
      setIsSubmitted(true);
      if (res.data.status === 'closed') setIsFinalized(true);
    } catch {
      setIsSubmitted(true);
    } finally {
      setLoadingStage(false);
    }
  };

  const handleNext = async (tokenPaidTo = null) => {
    const unitId = selectedUnit
      ? selectedUnit.plot_unit_id || selectedUnit.flat_unit_id
      : propertyId;
    const currentStageId = steps[currentStepIndex].id;
    const nextIndex = currentStepIndex + 1;

    setLoadingUpdate(true);
    try {
      if (currentStageId === 'VISIT_NEGOTIATE') {
        setModalMsg(headings.plot_confirm_msg || headings.flat_confirm_msg || "Within two weeks, please confirm the property by paying the token amount to proceed.");
      } else if (currentStageId === 'TOKEN_PAYMENT') {
        setModalMsg("Next step will move to Unregistered stage. Please proceed with documentation.");
      } else {
        setModalMsg('');
      }

      await endpoints.updateBookingStage({ propertyId, unitType: resolvedUnitType, unitId, phone, stage: currentStageId, tokenPaidTo });

      let newStatus;
      if (currentStageId === 'VISIT_NEGOTIATE') newStatus = 'ON_BOOKING';
      else if (currentStageId === 'TOKEN_PAYMENT') newStatus = 'CONFIRMED';
      else if (currentStageId === 'UNREGISTERED_DOC') newStatus = 'UNREGISTERED';
      else if (currentStageId === 'REGISTERED_DOC') newStatus = 'REGISTERED';
      else if (currentStageId === 'SALE_DEED') newStatus = transactionType === 'rent' ? 'RENTED' : 'SOLD';

      if (onStatusChange && newStatus) onStatusChange(newStatus);

      if (nextIndex >= steps.length) {
        setIsSubmitted(false);
      } else {
        setCurrentStepIndex(nextIndex);
        setIsSubmitted(false);
        setSelectedUnit(null);
        setRefreshLayoutKey(prev => prev + 1);
      }

      setGeneralRefreshKey(prev => prev + 1);

      if (currentStageId === 'VISIT_NEGOTIATE' || currentStageId === 'TOKEN_PAYMENT') {
        setShowReminderModal(true);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        alert("This unit is already booked by another buyer.");
        setSelectedUnit(null);
      }
    } finally {
      setLoadingUpdate(false);
    }
  };

  if (!steps.length) return null;

  const currentStep = steps[currentStepIndex];
  let activeIndex = -1;
  if (isSubmitted) {
    activeIndex = currentStepIndex;
  } else if (generalIndex !== null) {
    activeIndex = generalIndex;
  }

  const getCompletedOverviewIndexes = () => {
    const s = (generalStatus || '').toLowerCase();
    if (isFinalized || s === 'closed') return new Set(steps.map((_, idx) => idx));
    if (['registered', 'registered_doc'].includes(s)) return new Set([0, 1, 2, 3]);
    if (['unregistered', 'advance_paid'].includes(s)) return new Set([0, 1, 2]);
    if (['confirmed', 'token_paid'].includes(s)) return new Set([0, 1]);
    if (['on_booking', 'booked'].includes(s)) return new Set();
    return new Set();
  };

  const completedOverviewIndexes = getCompletedOverviewIndexes();
  const bookedPeopleCount = Number(bookedPeopleCountProp) || 0;

  const getPrimaryCtaLabel = () => "Book Contact";

  const getSubtitlePoints = (subtitle) => {
    if (Array.isArray(subtitle)) return subtitle.filter(Boolean);
    if (typeof subtitle === 'string' && subtitle.trim()) return [subtitle.trim()];
    return [];
  };

  return (
    <div className="booking-flow-container fade-in-up">
      {(loadingStage || loadingUpdate) && (
        <div className="booking-loader-overlay">
          <div className="booking-spinner" />
        </div>
      )}
      {showReminderModal && (
        <div className="modal-overlay">
          <div className="reminder-modal-compact">
            <Info className="modal-icon-small" />
            <p className="modal-text-small">{modalMsg}</p>
            <button className="mini-saffron-btn" onClick={() => setShowReminderModal(false)}>Got it</button>
          </div>
        </div>
      )}
      {isSalePlotOrFlat && !selectedUnit && !skipUnitSelection ? (
        <UnitSelector
          key={refreshLayoutKey}
          propertyId={propertyId}
          saleType={saleType}
          refreshKey={refreshLayoutKey}
          onSelectUnit={(unit) => setSelectedUnit(unit)}
          onNoPlots={() => setSkipUnitSelection(true)}
        />
      ) : (
        <>
          {!isSubmitted && selectedUnit && (
            <div className="selected-unit-header">
              <button
                onClick={() => { setSelectedUnit(null); setRefreshLayoutKey(prev => prev + 1); }}
                className="back-btn"
              >
                <ChevronLeft size={14} /> Back to Units
              </button>
              <div className="badge">
                {selectedUnitLabel}: {selectedUnitName}
              </div>
            </div>
          )}

          {!isSubmitted ? (
            <div className="general-overview">
              {!isFinalized && (
                <div className="phone-cta-row">
                  <div className="phone-cta-left">
                    <div className="phone-input-group large-input">
                      <span className="prefix">+91</span>
                      <input
                        type="tel"
                        value={phone}
                        maxLength="10"
                        placeholder="Enter 10-digit phone number"
                        onChange={e => setPhone(e.target.value)}
                      />
                    </div>
                    <button
                      className="primary-btn saffron-btn"
                      disabled={phone.length !== 10 || loadingStage}
                      onClick={checkStageByPhone}
                    >
                      {loadingStage ? "Checking..." : getPrimaryCtaLabel()}
                    </button>
                  </div>
                  <div className="phone-cta-arrow-spacer" />
                  {(() => {
                    const isRent = transactionType === 'rent';
                    const tickPts = isRent ? advantagePoints.rent_tick : advantagePoints.sale_tick;
                    const crossPts = isRent ? advantagePoints.rent_cross : advantagePoints.sale_cross;
                    if (!tickPts.length && !crossPts.length) return null;
                    return (
                      <div className={`advantage-box ${isRent ? 'advantage-rent' : 'advantage-sale'}`}>
                        {tickPts.map((pt, i) => (
                          <div key={i} className="advantage-row">
                            <span className="adv-icon adv-tick">✓</span>
                            <span className="adv-text">{pt}</span>
                          </div>
                        ))}
                        {crossPts.map((pt, i) => (
                          <div key={i} className="advantage-row">
                            <span className="adv-icon adv-cross">✗</span>
                            <span className="adv-text adv-text-muted">{pt}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="overview-split-layout">
                <div className="overview-heading-row">
                  <div className="overview-heading-col">
                    <h2 className="compact-title overview-heading-title">{headings.booking_process_heading || 'Booking Process'}</h2>
                    <p className="compact-subtitle-light overview-heading-subtitle">
                      {isFinalized
                        ? transactionType === 'rent' ? (headings.property_rented_label || 'Property Rented') : (headings.property_sold_label || 'Property Sold')
                        : transactionType === 'rent' ? (headings.booking_process_subtitle_rent || 'Rent in 4 steps') : (headings.booking_process_subtitle_sale || 'Buy it in 4 steps')}
                    </p>
                  </div>
                  <div className="overview-heading-arrow-spacer" />
                  <div className="overview-heading-col services-column-surface services-header-cell">
                    <h2 className="compact-title overview-heading-title">{headings.our_services_heading || 'Our Services'}</h2>
                    <p className="compact-subtitle-light overview-heading-subtitle">{headings.our_services_subtitle || 'We Provide'}</p>
                  </div>
                </div>

                <div className="overview-paired-rows">
                  {steps.map((step, idx) => {
                    const isDone = completedOverviewIndexes.has(idx);
                    const serviceRow = serviceRows.find(r => r.stageKey === step.id) || serviceRows[idx] || { id: `service-${idx}`, services: [] };
                    return (
                      <div key={step.id} className={`overview-paired-row ${isDone ? 'step-done' : ''}`}>
                        <div className="overview-item">
                          <div className="overview-dot-container">
                            <div className={`overview-dot ${isDone ? 'green-bg' : 'saffron-bg'}`}>{idx + 1}</div>
                            {idx < steps.length - 1 && (
                              <div className="overview-connector-wrap">
                                <div className="overview-connector-line" />
                                {step.timeframe && <span className="overview-connector-label">{step.timeframe}</span>}
                              </div>
                            )}
                          </div>
                          <div className="overview-text">
                            <div className="step-title-row">
                              <span className="ot-title-large">{step.title}</span>
                              {idx === 0 && bookedPeopleCount > 0 && (
                                <span className="booked-people-pill">{bookedPeopleCount}+ people booked</span>
                              )}
                            </div>
                            <div className="ot-subtitle-list">
                              {getSubtitlePoints(step.subtitle).map((line, lineIndex) => (
                                <span key={`${step.id}-subtitle-${lineIndex}`} className="ot-subtitle-large">{line}</span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flow-arrow-cell" aria-hidden="true">
                          <span className="flow-arrow-glyph">&rArr;</span>
                        </div>

                        <div className="paired-service-cell services-column-surface services-row-cell">
                          <div className="poster-row paired-services-row">
                            <div className="poster-services-list">
                              {serviceRow.services.map((service) => (
                                <div key={service} className="poster-service-item">
                                  <CheckCircle2 />
                                  <span>{service}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="booking-slide animate-fade">
              <div className="top-nav-row right">
                <button className="nav-btn-link" onClick={() => {
                  setIsSubmitted(false);
                  setRefreshLayoutKey(prev => prev + 1);
                  setGeneralRefreshKey(prev => prev + 1);
                }}>
                  Close
                </button>
              </div>
              <div className="slide-body">
                <h2 className="compact-title">{currentStep.title}</h2>
                <div className="points-list-compact">
                  {currentStep.points.map((p, i) => (
                    <div key={i} className="point-row">
                      <CheckCircle2 className="green-text" />
                      <span className="point-text-light">{p}</span>
                    </div>
                  ))}
                </div>
                {currentStep.id === 'VISIT_NEGOTIATE' && (
                  <div className="booking-offer-block">
                    <div className="booking-offer-title">Offer:</div>
                    <div className="points-list-compact booking-offer-points">
                      {offerPoints.map((point) => (
                        <div key={point} className="point-row">
                          <CheckCircle2 className="green-text" />
                          <span className="point-text-light">{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="slide-footer-compact">
                {transactionType === 'sale' && currentStep.id === 'TOKEN_PAYMENT' ? (
                  <div className="token-btn-row">
                    <button className="primary-btn token-mandi-btn" onClick={() => handleNext('Paid Us')}>
                      {headings.token_btn_mandi_label || 'Pay token amount via Mandi'}
                    </button>
                    <button className="primary-btn token-owner-btn" onClick={() => handleNext('Paid to Owner')}>
                      {headings.token_btn_owner_label || 'Paid token amount to Owner'}
                    </button>
                  </div>
                ) : (
                  <button className="primary-btn green-btn" onClick={() => handleNext()}>
                    {currentStep.nextLabel}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BookingFlow;
