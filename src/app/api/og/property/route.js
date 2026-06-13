import { ImageResponse } from 'next/og';
import { getPropertyMeta } from '@/lib/services/property.meta.service';

export const runtime = 'nodejs';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tnpropertymandi.in';
const DEFAULT_IMAGE = `${SITE_URL}/default-home.jpg`;

const fmt = (n) => {
  if (n == null || n === '' || Number.isNaN(Number(n)) || Number(n) === 0) return null;
  const v = Number(n);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
};

async function fetchAsBase64(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const mime = res.headers.get('content-type') || 'image/jpeg';
    return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get('id') || '';
  const passedImg = searchParams.get('img') || '';

  let p = null;
  try {
    p = identifier ? await getPropertyMeta(identifier) : null;
  } catch (err) {
    console.error('[og/property] getPropertyMeta error:', err?.message || err);
  }

  // Fallback card if property not found
  if (!p) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#0f172a', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', fontSize: 52, fontWeight: 800, color: '#ffffff' }}>TN Property Mandi</div>
        <div style={{ display: 'flex', fontSize: 22, color: '#94a3b8' }}>Real Estate in Tamil Nadu</div>
      </div>,
      { width: 1200, height: 630 }
    );
  }

  const isRent = !!p.rent_amount;
  const saleType = (p.sale_type || '').toLowerCase();
  const layoutOrLandmark = p.layout_name || p.title || p.street_name_or_road_name || p.landmark || p.street_name || '';
  const locationStr = p.village_name || p.taluk_name || p.district_name || '';

  const price = isRent ? fmt(p.rent_amount) : fmt(p.sale_price);
  const priceDisplay = isRent
    ? (price ? `${price}/mo` : '')
    : (p.rate_unit && price ? `${price}/${p.rate_unit}` : price || '');
  const typePart = isRent
    ? ((p.property_use || '').toLowerCase() === 'commercial' ? 'Commercial' : p.bhk ? `${p.bhk} BHK` : 'Residential')
    : (saleType ? saleType.charAt(0).toUpperCase() + saleType.slice(1) : 'Property');
  const extentPart = p.area_size || [p.extent_area, p.extent_unit].filter(Boolean).join(' ') || '';
  const infoLine = [p.formatted_id, typePart, priceDisplay, extentPart].filter(Boolean).join(' / ');

  const areaSalesSpeed = p.area_sales_speed != null ? `${Number(p.area_sales_speed).toFixed(1)}/M` : '—';
  const amenitiesRating = p.amenities_rating != null ? `${Number(p.amenities_rating).toFixed(1)}/10` : '—';
  const locationRating = p.utilities_rating != null ? `${Number(p.utilities_rating).toFixed(1)}/10` : '—';
  const legalGrade = p.legal_value || '—';

  // Pre-fetch image as base64 so Satori doesn't need to fetch external URLs
  const rawImageUrl = passedImg || p.primary_image || DEFAULT_IMAGE;
  const imageData = await fetchAsBase64(rawImageUrl);
  const imageUrl = imageData || rawImageUrl;

  const ratingCell = (bg, label, sublabel, value) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, padding: '14px 4px', flex: 1 }}>
      <span style={{ display: 'flex', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>{label}</span>
      <span style={{ display: 'flex', fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>{sublabel}</span>
      <span style={{ display: 'flex', fontSize: 24, fontWeight: 800, color: '#fff' }}>{value}</span>
    </div>
  );

  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#f8fafc', fontFamily: 'sans-serif' }}>
      {/* Property photo — top ~55% */}
      <div style={{ display: 'flex', width: '100%', height: 346, background: '#e2e8f0' }}>
        <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
      </div>

      {/* Info card — bottom ~45% */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '14px 40px 12px', background: '#f0fdf4' }}>
        {/* Location | Layout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ display: 'flex', width: 8, height: 8, background: '#3b82f6', borderRadius: 4 }} />
          {locationStr ? <span style={{ display: 'flex', fontSize: 15, color: '#475569', fontWeight: 600 }}>{locationStr}</span> : null}
          {locationStr && layoutOrLandmark ? <span style={{ display: 'flex', fontSize: 15, color: '#cbd5e1', margin: '0 4px' }}>|</span> : null}
          {layoutOrLandmark ? <span style={{ display: 'flex', fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{layoutOrLandmark}</span> : null}
        </div>

        {/* Info line */}
        {infoLine ? <div style={{ display: 'flex', fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 10 }}>{infoLine}</div> : null}

        {/* Ratings row */}
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: 10 }}>
          {!isRent && ratingCell('#24675e', 'Legal', 'grade', legalGrade)}
          {!isRent && ratingCell('#235bd8', 'Area Sales', 'speed', areaSalesSpeed)}
          {ratingCell('#d3a72f', 'Amenities', 'rating', amenitiesRating)}
          {ratingCell('#ea580c', 'Location', 'score', locationRating)}
        </div>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', width: 16, height: 16, background: '#24675e', borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ display: 'flex', color: '#fff', fontSize: 10, fontWeight: 800 }}>TN</span>
          </div>
          <span style={{ display: 'flex', fontSize: 13, color: '#64748b', fontWeight: 600 }}>tnpropertymandi.in</span>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
