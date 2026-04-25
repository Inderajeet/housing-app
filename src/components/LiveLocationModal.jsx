'use client';

import React, { useState, useRef, useEffect } from 'react';

const LiveLocationModal = ({ data, onChange, onNext }) => {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);

    const resolveAddressFromCoordinates = async (latitude, longitude) => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API;
        if (!latitude || !longitude || !apiKey) return '';

        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
            );
            const result = await response.json();
            return result?.results?.[0]?.formatted_address || '';
        } catch (error) {
            console.error('Address lookup failed:', error);
            return '';
        }
    };

    const handleStartCamera = async () => {
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false
            });

            setStream(videoStream);
            setIsCameraActive(true);

            if (videoRef.current) {
                videoRef.current.srcObject = videoStream;
                await videoRef.current.play();
            }
        } catch (err) {
            console.error("Camera error:", err);
            alert("Could not access camera. Please check permissions.");
        }
    };

    const handleCapture = async () => {
        const video = videoRef.current;

        if (!video || !stream) {
            alert("Camera not initialized.");
            return;
        }

        setIsProcessing(true);
        setIsResolvingAddress(false);

        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = canvas.toDataURL('image/jpeg', 1);
            onChange('liveImage', imageData);

            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve(pos),
                    (error) => reject(error),
                    { enableHighAccuracy: true }
                );
            });

            const latitude = position.coords.latitude.toFixed(6);
            const longitude = position.coords.longitude.toFixed(6);

            onChange('latitude', latitude);
            onChange('longitude', longitude);

            setIsResolvingAddress(true);
            const address = await resolveAddressFromCoordinates(latitude, longitude);
            if (address) {
                onChange('address', address);
            }
            setIsResolvingAddress(false);

            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setIsCameraActive(false);
        } catch (err) {
            console.error("Capture failed", err);
            setIsResolvingAddress(false);
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [stream]);

    const isReady = data.latitude && data.longitude && data.liveImage;

    return (
        <div className="modal-content">
            <h2>Location Proof</h2>
            <p>Please capture a live photo of the property and location.</p>

            <div className="live-location-area">
                <div style={{ display: isCameraActive ? 'block' : 'none', marginBottom: '15px' }}>
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        style={{ width: '100%', borderRadius: '8px', background: '#000' }}
                    />
                    <button
                        type="button"
                        onClick={handleCapture}
                        disabled={isProcessing || isResolvingAddress}
                        className="primary-button take-photo-btn"
                        style={{ marginTop: '10px', width: '100%' }}
                    >
                        {isProcessing ? 'Capturing photo and location...' : 'Capture Photo & Location'}
                    </button>
                </div>

                {!isCameraActive && (
                    <button
                        type="button"
                        onClick={handleStartCamera}
                        className={`secondary-button capture-btn ${isReady ? 'captured' : ''}`}
                        disabled={isProcessing || isResolvingAddress}
                    >
                        {isReady ? 'Captured (Retake)' : 'Capture Live Photo'}
                    </button>
                )}

                {(isProcessing || isResolvingAddress) && (
                    <div className="modal-inline-loader">
                        <div className="modal-spinner" />
                        <span>{isResolvingAddress ? 'Resolving address...' : 'Getting live photo and location...'}</span>
                    </div>
                )}

                <div className="captured-details-group" style={{ marginTop: '15px' }}>
                    {isReady && !isCameraActive && (
                        <div style={{ marginBottom: '10px' }}>
                            <img
                                src={data.liveImage}
                                alt="Captured"
                                style={{ width: '120px', borderRadius: '8px', border: '1px solid #ccc' }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {(isResolvingAddress || data.address) && (
                <div className="captured-details-group" style={{ marginTop: '12px' }}>
                    {isResolvingAddress && (
                        <div className="captured-details">Resolving address...</div>
                    )}
                    {data.address && (
                        <div className="captured-details">
                            <b>Address:</b> {data.address}
                        </div>
                    )}
                </div>
            )}

            <div className="modal-actions full-width-center">
                <button
                    type="button"
                    onClick={onNext}
                    className="primary-button"
                    disabled={!isReady || isCameraActive || isProcessing || isResolvingAddress}
                >
                    Continue
                </button>
            </div>
        </div>
    );
};

export default LiveLocationModal;
