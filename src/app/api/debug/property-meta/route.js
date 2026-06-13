import { NextResponse } from 'next/server';
import { getPropertyMeta } from '@/lib/services/property.meta.service';

export const runtime = 'nodejs';

// Debug: /api/debug/property-meta?id=<slug>
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
        property_type: result.property_type,
        formatted_id: result.formatted_id,
        title: result.title,
        status: result.status,
        live_image: result.live_image,
        primary_image: result.primary_image,
        asset_images: result.asset_images,
        sp_images: result.sp_images,
        village_name: result.village_name,
        amenities_rating: result.amenities_rating,
        utilities_rating: result.utilities_rating,
        legal_value: result.legal_value,
        area_sales_speed: result.area_sales_speed,
        sale_price: result.sale_price,
        rent_amount: result.rent_amount,
      } : null,
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
