import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import prisma from '@/lib/prisma';

const SQFT_PER_CENT = 435.6;

function getRatePriceCurve(priceNum, rateUnit) {
  if (!priceNum || priceNum <= 0) return null;
  if (rateUnit === 'sqft') return parseFloat((priceNum * SQFT_PER_CENT / 100000).toFixed(4));
  if (rateUnit === 'cent') return parseFloat((priceNum / 100000).toFixed(4));
  return null;
}

// Map incoming status param → SQL condition on sale_status
function buildStatusCondition(status) {
  switch (status) {
    case 'sold':
      return `sp.sale_status IN ('SOLD', 'REGISTERED', 'UNREGISTERED')`;
    case 'confirmed':
      return `sp.sale_status = 'CONFIRMED'`;
    case 'on_booking':
      return `sp.sale_status IN ('ON_BOOKING', 'BOOKED')`;
    case 'nil_booking':
      return `sp.sale_status = 'Nil Booking' OR sp.sale_status IS NULL`;
    default:
      return `sp.sale_status IN ('SOLD', 'REGISTERED', 'UNREGISTERED')`;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));
    const status = searchParams.get('status') || 'sold';

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
    }

    // Timeframe: Jan 1 of last year → current month end
    const now = new Date();
    const startOfRange = new Date(now.getFullYear() - 1, 0, 1); // Jan 1 last year

    const statusCondition = buildStatusCondition(status);

    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        p.property_id, p.formatted_id, p.latitude, p.longitude,
        p.title, p.address, p.contact_phone,
        d.district_name, t.taluk_name, v.village_name,
        sp.sale_type, sp.price, sp.rate_unit, sp.area_size, sp.extension,
        sp.sale_status, sp.sold_date, sp.sold_rate,
        sp.street_name_or_road_name, sp.layout_name,
        (SELECT file_url FROM property_assets WHERE property_id = p.property_id AND asset_type = 'image' ORDER BY sort_order ASC LIMIT 1) AS primary_image,
        (
          6371 * acos(
            LEAST(1.0, cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2))
            + sin(radians($1)) * sin(radians(p.latitude)))
          )
        ) AS distance_km
      FROM properties p
      INNER JOIN sale_properties sp ON sp.property_id = p.property_id
      LEFT JOIN districts d ON d.district_id = p.district_id
      LEFT JOIN taluks t ON t.taluk_id = p.taluk_id
      LEFT JOIN villages v ON v.village_id = p.village_id
      WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        AND p.property_type = 'sale'
        AND p.created_at >= $3
        AND (${statusCondition})
        AND (
          6371 * acos(
            LEAST(1.0, cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2))
            + sin(radians($1)) * sin(radians(p.latitude)))
          )
        ) <= 1
      ORDER BY p.created_at ASC
    `, lat, lng, startOfRange);

    const priceCurvePoints = [];
    const areaSpeedByMonth = {};

    for (const row of rows) {
      const dateRef = row.sold_date ? new Date(row.sold_date) : new Date(row.created_at || Date.now());
      const monthKey = `${dateRef.getFullYear()}-${String(dateRef.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = dateRef.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

      if (!areaSpeedByMonth[monthKey]) {
        areaSpeedByMonth[monthKey] = { monthKey, monthLabel, count: 0, properties: [] };
      }
      areaSpeedByMonth[monthKey].count += 1;
      areaSpeedByMonth[monthKey].properties.push({
        ...row,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        booking_status: row.sale_status,
      });

      const rateLakhsPerCent = getRatePriceCurve(Number(row.price), row.rate_unit);
      if (rateLakhsPerCent != null && rateLakhsPerCent > 0) {
        priceCurvePoints.push({
          ...row,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          booking_status: row.sale_status,
          monthKey,
          monthLabel,
          rate_lakhs_per_cent: rateLakhsPerCent,
          distance_km: Number(row.distance_km).toFixed(3),
        });
      }
    }

    // Fill every month in range (even 0-count months)
    const months = [];
    const cursor = new Date(startOfRange);
    cursor.setDate(1);
    while (cursor <= now) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const label = cursor.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      const entry = areaSpeedByMonth[key];
      months.push({ monthKey: key, monthLabel: label, count: entry?.count || 0, properties: entry?.properties || [] });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return NextResponse.json({
      priceCurvePoints,
      areaSpeedMonths: months,
      totalProperties: rows.length,
    });
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
