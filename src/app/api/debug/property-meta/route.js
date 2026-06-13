import { NextResponse } from 'next/server';
import { getPropertyMeta } from '@/lib/services/property.meta.service';

export const runtime = 'nodejs';

// Debug endpoint: /api/debug/property-meta?id=<identifier>
// Returns raw getPropertyMeta result so we can verify the query works in prod
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'Missing ?id= param' }, { status: 400 });

  try {
    const result = await getPropertyMeta(id);
    return NextResponse.json({
      identifier: id,
      found: !!result,
      data: result ? {
        property_id: result.property_id,
        formatted_id: result.formatted_id,
        title: result.title,
        primary_image: result.primary_image,
        village_name: result.village_name,
        amenities_rating: result.amenities_rating,
        utilities_rating: result.utilities_rating,
        legal_value: result.legal_value,
        area_sales_speed: result.area_sales_speed,
        rent_amount: result.rent_amount,
        sale_price: result.sale_price,
      } : null,
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
