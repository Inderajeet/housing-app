-- Migration: Add custom fields to properties, sale_properties, and rent_properties
-- Run this against your PostgreSQL database once.

-- ── properties ───────────────────────────────────────────────────────────────

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS area_speed        DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS amenities_rating  DECIMAL(3, 1),
  ADD COLUMN IF NOT EXISTS utilities_rating  DECIMAL(3, 1),
  ADD COLUMN IF NOT EXISTS legal_rating      DECIMAL(3, 1);

-- ── sale_properties ──────────────────────────────────────────────────────────

ALTER TABLE sale_properties
  ADD COLUMN IF NOT EXISTS legal_value       VARCHAR(5)     DEFAULT 'A+',
  ADD COLUMN IF NOT EXISTS area_sales_speed  DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS facing            VARCHAR(20),
  ADD COLUMN IF NOT EXISTS road_width        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS listing_person_phone VARCHAR(20);

-- Backfill: set legal_value = 'A+' for all existing sale properties
UPDATE sale_properties SET legal_value = 'A+' WHERE legal_value IS NULL;

-- ── rent_properties ──────────────────────────────────────────────────────────

ALTER TABLE rent_properties
  ADD COLUMN IF NOT EXISTS legal_value       VARCHAR(5)     DEFAULT 'A+',
  ADD COLUMN IF NOT EXISTS area_sales_speed  DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS facing            VARCHAR(20),
  ADD COLUMN IF NOT EXISTS road_width        VARCHAR(50);

-- Backfill: set legal_value = 'A+' for all existing rent properties
UPDATE rent_properties SET legal_value = 'A+' WHERE legal_value IS NULL;
