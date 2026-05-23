import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import prisma from '@/lib/prisma';

const SQFT_PER_CENT = 435.6;

function getRatePriceCurve(priceNum, rateUnit, extensionStr, areaSizeUnit) {
  if (!priceNum || priceNum <= 0) return null;

  // price is rate per sqft or per cent (not total price)
  if (rateUnit === 'sqft') {
    // convert to per cent
    return parseFloat((priceNum * SQFT_PER_CENT / 100000).toFixed(4)); // in lakhs/cent
  }
  if (rateUnit === 'cent') {
    return parseFloat((priceNum / 100000).toFixed(4)); // in lakhs/cent
  }
  return null;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
    }

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        p.property_id, p.formatted_id, p.latitude, p.longitude,
        p.title, p.address,
        d.district_name, t.taluk_name, v.village_name,
        sp.sale_type, sp.price, sp.rate_unit, sp.area_size, sp.extension,
        sp.sale_status, sp.sold_date, sp.sold_rate,
        sp.street_name_or_road_name, sp.layout_name,
        sp.boundary_north, sp.boundary_south, sp.boundary_east, sp.boundary_west,
        p.contact_phone,
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
        AND sp.sold_date IS NOT NULL
        AND sp.sold_date >= $3
        AND (
          6371 * acos(
            LEAST(1.0, cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2))
            + sin(radians($1)) * sin(radians(p.latitude)))
          )
        ) <= 1
      ORDER BY sp.sold_date ASC
    `, lat, lng, twoYearsAgo);

    const priceCurvePoints = [];
    const areaSpeedByMonth = {};

    for (const row of rows) {
      const soldDate = new Date(row.sold_date);
      const monthKey = `${soldDate.getFullYear()}-${String(soldDate.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = soldDate.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

      // Area Sales Speed: count per month
      if (!areaSpeedByMonth[monthKey]) {
        areaSpeedByMonth[monthKey] = { monthKey, monthLabel, count: 0, properties: [] };
      }
      areaSpeedByMonth[monthKey].count += 1;
      areaSpeedByMonth[monthKey].properties.push(row);

      // Price Curve: rate per cent in lakhs
      const priceNum = Number(row.price);
      const rateLakhsPerCent = getRatePriceCurve(priceNum, row.rate_unit, row.extension, row.area_size);
      if (rateLakhsPerCent != null && rateLakhsPerCent > 0) {
        priceCurvePoints.push({
          ...row,
          monthKey,
          monthLabel,
          rate_lakhs_per_cent: rateLakhsPerCent,
          distance_km: Number(row.distance_km).toFixed(3),
        });
      }
    }

    // Build sorted month range for area speed chart (all months in range even if 0)
    const now = new Date();
    const months = [];
    const cursor = new Date(twoYearsAgo);
    cursor.setDate(1);
    while (cursor <= now) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const label = cursor.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      const entry = areaSpeedByMonth[key];
      months.push({
        monthKey: key,
        monthLabel: label,
        count: entry?.count || 0,
        properties: entry?.properties || [],
      });
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
