import { NextResponse } from 'next/server';
import { getPropertyMeta } from '@/lib/services/property.meta.service';

export const runtime = 'nodejs';

// Debug: /api/debug/property-meta?id=<slug>
// Debug image fetch: /api/debug/property-meta?img=<url>
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // Image fetch test
  const imgUrl = searchParams.get('img');
  if (imgUrl) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(imgUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TN-Property-OG/1.0)',
          'Accept': 'image/*,*/*',
        },
      });
      clearTimeout(t);
      const buf = res.ok ? await res.arrayBuffer() : null;
      return NextResponse.json({
        url: imgUrl,
        status: res.status,
        ok: res.ok,
        contentType: res.headers.get('content-type'),
        bytes: buf ? buf.byteLength : null,
      });
    } catch (e) {
      return NextResponse.json({ url: imgUrl, error: e?.message || String(e) }, { status: 500 });
    }
  }

  const id = searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'Missing ?id= or ?img= param' }, { status: 400 });

  try {
    const result = await getPropertyMeta(id);
    return NextResponse.json({
      identifier: id,
      found: !!result,
      data: result ? {
        property_id: result.property_id,
        formatted_id: result.formatted_id,
        title: result.title,
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
