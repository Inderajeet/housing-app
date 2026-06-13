import { ImageResponse } from 'next/og';
import React from 'react';
import { getPropertyMeta } from '@/lib/services/property.meta.service';

export const runtime = 'nodejs';

const e = React.createElement;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tnpropertymandi.in';

const fmt = (n) => {
  if (n == null || n === '' || Number.isNaN(Number(n)) || Number(n) === 0) return null;
  const v = Number(n);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
};

async function fetchAsBase64(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const mime = res.headers.get('content-type') || 'image/jpeg';
    // Strip charset or extra params from mime type
    const cleanMime = mime.split(';')[0].trim();
    return `data:${cleanMime};base64,${Buffer.from(buf).toString('base64')}`;
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

  if (!p) {
    return new ImageResponse(
      e('div', { style: { display: 'flex', width: '100%', height: '100%', background: '#0f172a', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 } },
        e('div', { style: { display: 'flex', fontSize: 52, fontWeight: 800, color: '#ffffff' } }, 'TN Property Mandi'),
        e('div', { style: { display: 'flex', fontSize: 22, color: '#94a3b8' } }, 'Real Estate in Tamil Nadu')
      ),
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

  // Fetch property image as base64 with 5s timeout
  const rawImageUrl = passedImg || p.primary_image || null;
  const imageData = rawImageUrl ? await fetchAsBase64(rawImageUrl) : null;

  const cell = (bg, label, sublabel, value) =>
    e('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, padding: '14px 4px', flex: 1 } },
      e('span', { style: { display: 'flex', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' } }, label),
      e('span', { style: { display: 'flex', fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 } }, sublabel),
      e('span', { style: { display: 'flex', fontSize: 24, fontWeight: 800, color: '#fff' } }, value)
    );

  const ratingCells = [
    ...(!isRent ? [cell('#24675e', 'Legal', 'grade', legalGrade), cell('#235bd8', 'Area Sales', 'speed', areaSalesSpeed)] : []),
    cell('#d3a72f', 'Amenities', 'rating', amenitiesRating),
    cell('#ea580c', 'Location', 'score', locationRating),
  ];

  // Image section — only render if we got image data
  const imgSection = imageData
    ? e('div', { style: { display: 'flex', width: '100%', height: 346, background: '#e2e8f0' } },
        e('img', { src: imageData, style: { width: '100%', height: '100%', objectFit: 'cover' }, alt: '' })
      )
    : e('div', { style: { display: 'flex', width: '100%', height: 346, background: '#1e3a5f', alignItems: 'center', justifyContent: 'center' } },
        e('span', { style: { display: 'flex', fontSize: 36, fontWeight: 700, color: 'rgba(255,255,255,0.3)' } }, 'TN Property Mandi')
      );

  const locLine = [
    locationStr ? e('span', { style: { display: 'flex', fontSize: 15, color: '#475569', fontWeight: 600 } }, locationStr) : null,
    locationStr && layoutOrLandmark ? e('span', { style: { display: 'flex', fontSize: 15, color: '#cbd5e1', margin: '0 4px' } }, '|') : null,
    layoutOrLandmark ? e('span', { style: { display: 'flex', fontSize: 17, fontWeight: 800, color: '#0f172a' } }, layoutOrLandmark) : null,
  ].filter(Boolean);

  return new ImageResponse(
    e('div', { style: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#f8fafc', fontFamily: 'sans-serif' } },
      imgSection,
      e('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, padding: '14px 40px 12px', background: '#f0fdf4' } },
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 } },
          e('div', { style: { display: 'flex', width: 8, height: 8, background: '#3b82f6', borderRadius: 4 } }),
          ...locLine
        ),
        infoLine ? e('div', { style: { display: 'flex', fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 10 } }, infoLine) : null,
        e('div', { style: { display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: 10 } },
          ...ratingCells
        ),
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
          e('div', { style: { display: 'flex', width: 16, height: 16, background: '#24675e', borderRadius: 3, alignItems: 'center', justifyContent: 'center' } },
            e('span', { style: { display: 'flex', color: '#fff', fontSize: 10, fontWeight: 800 } }, 'TN')
          ),
          e('span', { style: { display: 'flex', fontSize: 13, color: '#64748b', fontWeight: 600 } }, 'tnpropertymandi.in')
        )
      )
    ),
    { width: 1200, height: 630 }
  );
}
