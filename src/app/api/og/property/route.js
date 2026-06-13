import { ImageResponse } from 'next/og';
import React from 'react';
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

const toAbsoluteUrl = (url) => {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  return `${SITE_URL}${s.startsWith('/') ? '' : '/'}${s}`;
};

const e = React.createElement;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get('id') || '';
  // Image URL pre-fetched by generateMetadata to avoid double DB round-trip
  const passedImg = searchParams.get('img') || '';

  let p = null;
  try {
    p = identifier ? await getPropertyMeta(identifier) : null;
  } catch (err) {
    console.error('[og/property] getPropertyMeta error:', err?.message || err);
  }

  const fallback = e('div', {
    style: { display: 'flex', width: '100%', height: '100%', background: '#0f172a', alignItems: 'center', justifyContent: 'center' }
  },
    e('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 } },
      e('div', { style: { display: 'flex', fontSize: 48, fontWeight: 800, color: '#ffffff' } }, 'TN Property Mandi'),
      e('div', { style: { display: 'flex', fontSize: 20, color: '#94a3b8' } }, 'Real Estate in Tamil Nadu')
    )
  );

  if (!p) {
    return new ImageResponse(fallback, { width: 1200, height: 630 });
  }

  const isRent = !!p.rent_amount;
  const saleType = (p.sale_type || '').toLowerCase();
  const landmark = p.street_name_or_road_name || p.landmark || p.street_name || '';
  const layoutOrLandmark = p.layout_name || p.title || landmark || '';
  const locationStr = p.village_name || p.taluk_name || p.district_name || '';

  const price = isRent ? fmt(p.rent_amount) : fmt(p.sale_price);
  const priceDisplay = isRent
    ? (price ? `${price}/mo` : '')
    : (p.rate_unit && price ? `${price}/${p.rate_unit}` : price || '');

  const typePart = isRent
    ? ((p.property_use || '').toLowerCase() === 'commercial' ? 'Commercial' : p.bhk ? `${p.bhk} BHK` : 'Residential')
    : (saleType ? saleType.charAt(0).toUpperCase() + saleType.slice(1) : 'Property');

  const extentPart = [p.area_size].filter(Boolean).join(' ')
    || [p.extent_area, p.extent_unit].filter(Boolean).join(' ');

  // Use passed image (from generateMetadata) first, then DB result, then default
  const imageUrl = toAbsoluteUrl(passedImg) || toAbsoluteUrl(p.primary_image) || DEFAULT_IMAGE;

  const idPart = p.formatted_id || '';
  const infoLine = [idPart, typePart, priceDisplay, extentPart].filter(Boolean).join(' / ');

  const areaSalesSpeed = p.area_sales_speed != null ? `${Number(p.area_sales_speed).toFixed(1)}/M` : '—';
  const amenitiesRating = p.amenities_rating != null ? `${Number(p.amenities_rating).toFixed(1)}/10` : '—';
  const locationRating = p.utilities_rating != null ? `${Number(p.utilities_rating).toFixed(1)}/10` : '—';
  const legalGrade = p.legal_value || '—';

  const ratingCell = (bg, label, sublabel, value) =>
    e('div', {
      style: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: bg, padding: '12px 4px', flex: 1,
      }
    },
      e('span', { style: { display: 'flex', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.1, textAlign: 'center' } }, label),
      e('span', { style: { display: 'flex', fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4, lineHeight: 1 } }, sublabel),
      e('span', { style: { display: 'flex', fontSize: 22, fontWeight: 800, color: '#ffffff', lineHeight: 1.1 } }, value)
    );

  const ratingsRow = e('div', {
    style: { display: 'flex', gap: 0, background: '#e2e8f0', borderRadius: 8, marginTop: 14, overflow: 'hidden', border: '1px solid #cbd5e1' }
  },
    ...(isRent ? [] : [
      ratingCell('#24675e', 'Legal', 'grade', legalGrade),
      ratingCell('#235bd8', 'Area Sales', 'speed', areaSalesSpeed),
    ]),
    ratingCell('#d3a72f', 'Amenities', 'rating', amenitiesRating),
    ratingCell('#ea580c', 'Location', 'score', locationRating),
  );

  const IMG_H = 340;

  const content = e('div', {
    style: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#f8fafc', fontFamily: 'sans-serif' }
  },
    // Property photo
    e('div', { style: { display: 'flex', position: 'relative', width: '100%', height: IMG_H, overflow: 'hidden', background: '#e2e8f0' } },
      e('img', { src: imageUrl, style: { width: '100%', height: '100%', objectFit: 'cover' }, alt: '' }),
      e('div', { style: { display: 'flex', position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, transparent, rgba(248,250,252,0.95))' } })
    ),

    // Card section
    e('div', {
      style: { display: 'flex', flexDirection: 'column', flex: 1, padding: '14px 40px 14px 40px', background: '#f0fdf4' }
    },
      // Location pin dot + location | layout name on same line
      e('div', {
        style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }
      },
        e('div', { style: { display: 'flex', width: 8, height: 8, background: '#3b82f6', borderRadius: 4, flexShrink: 0 } }),
        locationStr
          ? e('span', { style: { display: 'flex', fontSize: 15, color: '#475569', fontWeight: 600 } }, locationStr)
          : null,
        locationStr && layoutOrLandmark
          ? e('span', { style: { display: 'flex', fontSize: 15, color: '#cbd5e1', marginLeft: 2, marginRight: 2 } }, '|')
          : null,
        layoutOrLandmark
          ? e('span', { style: { display: 'flex', fontSize: 17, fontWeight: 800, color: '#0f172a' } }, layoutOrLandmark)
          : null,
      ),

      // Info line
      infoLine
        ? e('div', { style: { display: 'flex', fontSize: 14, color: '#64748b', marginTop: 2, fontWeight: 500 } }, infoLine)
        : null,

      // Ratings grid
      ratingsRow,

      // Domain badge
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 } },
        e('div', { style: { display: 'flex', width: 16, height: 16, background: '#24675e', borderRadius: 3, alignItems: 'center', justifyContent: 'center' } },
          e('span', { style: { display: 'flex', color: '#fff', fontSize: 10, fontWeight: 800 } }, 'TN')
        ),
        e('span', { style: { display: 'flex', fontSize: 13, color: '#64748b', fontWeight: 600 } }, 'tnpropertymandi.in')
      )
    )
  );

  return new ImageResponse(content, { width: 1200, height: 630 });
}
