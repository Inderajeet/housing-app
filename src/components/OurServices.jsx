'use client';

import React from "react";
import { FaCheckCircle } from "react-icons/fa";
import "../styles/OurServices.css";

const OurServices = ({ serviceRows = [], services = [], showHeader = true, className = "" }) => {
  if (!showHeader) {
    return (
      <div className={`poster-row paired-services-row ${className}`.trim()}>
        <div className="poster-services-list">
          {services.map((service) => (
            <div key={service} className="poster-service-item">
              <FaCheckCircle />
              <span>{service}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="our-services-poster">
      <div className="poster-header">
        <h2 className="poster-main-title">Our Services</h2>
        <p className="poster-subtitle">We Provide</p>
      </div>
      <div className="poster-rows">
        {serviceRows.map((row) => (
          <div key={row.id} className="poster-row">
            <div className="poster-services-list">
              {row.services.map((service) => (
                <div key={service} className="poster-service-item">
                  <FaCheckCircle />
                  <span>{service}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default OurServices;
