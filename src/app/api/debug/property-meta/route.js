import { NextResponse } from 'next/server';
import { getPropertyMeta } from '@/lib/services/property.meta.service';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

// Debug endpoint: /api/debug/property-meta?id=<identifier>
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'Missing ?id= param' }, { status: 400 });

  try {
    const result = await getPropertyMeta(id);

    // Also check property_assets directly for that property_id
    let assetCheck = null;
    if (result?.property_id) {
      try {
        const assets = await prisma.$queryRawUnsafe(
          `SELECT asset_id, asset_type, file_url FROM property_assets WHERE property_id = $1 LIMIT 5`,
          result.property_id
        );
        assetCheck = assets;
      } catch (e) {
        assetCheck = { error: e?.message };
      }
    }

    return NextResponse.json({
      identifier: id,
      found: !!result,
      data: result ? {
        property_id: result.property_id,
        property_type: result.property_type,
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
      asset_check: assetCheck,
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
