import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import prisma from '@/lib/prisma';

function buildMapStatusCondition(status) {
  switch (status) {
    case 'sold':        return `sp.sale_status IN ('SOLD', 'REGISTERED', 'UNREGISTERED')`;
    case 'confirmed':   return `sp.sale_status = 'CONFIRMED'`;
    case 'on_booking':  return `sp.sale_status IN ('ON_BOOKING', 'BOOKED')`;
    case 'nil_booking': return `(sp.sale_status = 'Nil Booking' OR sp.sale_status IS NULL)`;
    default:            return '1=1';
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat    = parseFloat(searchParams.get('lat'));
    const lng    = parseFloat(searchParams.get('lng'));
    const range  = Math.min(Math.max(parseFloat(searchParams.get('range') || '1'), 1), 5);
    const status = searchParams.get('status') || '';

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
    }

    const statusClause = status ? buildMapStatusCondition(status) : '1=1';

    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        p.property_id, p.formatted_id, p.latitude, p.longitude,
        p.title, p.contact_phone,
        d.district_name, t.taluk_name, v.village_name,
        sp.sale_type, sp.price, sp.rate_unit, sp.sale_status, sp.sold_date,
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
        AND (${statusClause})
        AND (
          6371 * acos(
            LEAST(1.0, cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2))
            + sin(radians($1)) * sin(radians(p.latitude)))
          )
        ) <= $3
      ORDER BY distance_km ASC
      LIMIT 200
    `, lat, lng, range);

    const properties = rows.map(r => ({
      ...r,
      latitude:   Number(r.latitude),
      longitude:  Number(r.longitude),
      distance_km: Number(r.distance_km).toFixed(3),
    }));

    return NextResponse.json({ properties, total: properties.length, range });
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
