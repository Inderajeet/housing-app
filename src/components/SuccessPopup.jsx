'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import '../styles/SuccessPopup.css';

const SuccessPopup = ({ message, onOk }) => (
    <div className="success-popup-overlay">
        <div className="success-popup-card" role="dialog" aria-modal="true">
            <CheckCircle2 className="success-popup-icon" size={44} />
            <p className="success-popup-text">{message}</p>
            <button type="button" className="success-popup-btn" onClick={onOk}>OK</button>
        </div>
    </div>
);

export default SuccessPopup;
