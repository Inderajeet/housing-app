import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import prisma from '@/lib/prisma';

// Returns avg sold properties per month within 1km radius over the past 2 years
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
    }

    const rows = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::INT AS total_sold
      FROM properties p
      INNER JOIN sale_properties sp ON sp.property_id = p.property_id
      WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        AND sp.sold_date >= CURRENT_DATE - INTERVAL '2 years'
        AND sp.sale_status = 'SOLD'
        AND (
          6371 * acos(
            LEAST(1.0, cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2))
            + sin(radians($1)) * sin(radians(p.latitude)))
          )
        ) <= 1
    `, lat, lng);

    const totalSold = Number(rows[0]?.total_sold || 0);
    const area_speed = totalSold > 0 ? parseFloat((totalSold / 24).toFixed(2)) : 0;

    return NextResponse.json({ area_speed, total_sold: totalSold });
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
