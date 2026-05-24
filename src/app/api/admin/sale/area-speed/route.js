import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import prisma from '@/lib/prisma';

/**
 * Calculates Area Sales Speed for a given lat/lng:
 *   count of SOLD properties within 1km, from Jan 1 of last year to now
 *   divided by the number of months in that range.
 *
 * Optionally saves the result to a property when propertyId is supplied (POST).
 */

function getTimeframe() {
  const now = new Date();
  const startOfRange = new Date(now.getFullYear() - 1, 0, 1); // Jan 1 last year
  // months = (currentYear - lastYear)*12 + currentMonth  (+1 since January=0)
  const months =
    (now.getFullYear() - startOfRange.getFullYear()) * 12 +
    (now.getMonth() - startOfRange.getMonth()) + 1;
  return { startOfRange, months };
}

async function calcAreaSalesSpeed(lat, lng) {
  const { startOfRange, months } = getTimeframe();

  const rows = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::INT AS total_sold
    FROM properties p
    INNER JOIN sale_properties sp ON sp.property_id = p.property_id
    WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
      AND p.property_type = 'sale'
      AND p.created_at >= $3
      AND sp.sale_status IN ('SOLD', 'REGISTERED', 'UNREGISTERED')
      AND (
        6371 * acos(
          LEAST(1.0, cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2))
          + sin(radians($1)) * sin(radians(p.latitude)))
        )
      ) <= 1
  `, lat, lng, startOfRange);

  const totalSold = Number(rows[0]?.total_sold || 0);
  const area_sales_speed = months > 0 ? parseFloat((totalSold / months).toFixed(2)) : 0;
  return { area_sales_speed, total_sold: totalSold, months };
}

// GET — read-only calculation (used by the Recalculate button in admin)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
    }
    const result = await calcAreaSalesSpeed(lat, lng);
    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

// POST — calculate and persist to both sale_properties and properties.area_speed
export async function POST(request) {
  try {
    const { propertyId, lat, lng } = await request.json();
    if (!propertyId || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      return NextResponse.json({ error: 'propertyId, lat, and lng required' }, { status: 400 });
    }

    const result = await calcAreaSalesSpeed(parseFloat(lat), parseFloat(lng));

    await prisma.$executeRawUnsafe(
      `UPDATE sale_properties SET area_sales_speed = $1 WHERE property_id = $2`,
      result.area_sales_speed, propertyId
    );
    await prisma.$executeRawUnsafe(
      `UPDATE properties SET area_speed = $1 WHERE property_id = $2`,
      result.area_sales_speed, propertyId
    );

    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
