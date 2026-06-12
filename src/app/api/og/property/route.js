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

const e = React.createElement;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get('id') || '';

  let p = null;
  try { p = identifier ? await getPropertyMeta(identifier) : null; } catch {}

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
  const location = [p.village_name, p.taluk_name, p.district_name].filter(Boolean).join(', ');

  const price = isRent ? fmt(p.rent_amount) : fmt(p.sale_price);
  const priceDisplay = isRent
    ? (price ? `${price}/mo` : '')
    : (p.rate_unit && price ? `${price}/${p.rate_unit}` : price || '');

  const typePart = isRent
    ? ((p.property_use || '').toLowerCase() === 'commercial' ? 'Commercial' : p.bhk ? `${p.bhk} BHK` : 'Residential')
    : (saleType ? saleType.charAt(0).toUpperCase() + saleType.slice(1) : 'Property');

  const extentPart = [p.area_size].filter(Boolean).join(' ')
    || [p.extent_area, p.extent_unit].filter(Boolean).join(' ');

  const imageUrl = p.primary_image || DEFAULT_IMAGE;

  const pills = [];
  if (typePart) pills.push(e('div', {
    key: 'type',
    style: { display: 'flex', background: '#1e40af', color: '#dbeafe', padding: '6px 16px', borderRadius: 20, fontSize: 16, fontWeight: 700 }
  }, typePart));
  if (priceDisplay) pills.push(e('div', {
    key: 'price',
    style: { display: 'flex', background: '#065f46', color: '#d1fae5', padding: '6px 16px', borderRadius: 20, fontSize: 16, fontWeight: 700 }
  }, priceDisplay));
  if (extentPart) pills.push(e('div', {
    key: 'extent',
    style: { display: 'flex', background: '#78350f', color: '#fef3c7', padding: '6px 16px', borderRadius: 20, fontSize: 16, fontWeight: 700 }
  }, extentPart));

  const bottomItems = [];
  if (p.formatted_id) bottomItems.push(e('div', {
    key: 'fid',
    style: { display: 'flex', color: '#94a3b8', fontSize: 15, fontWeight: 600 }
  }, p.formatted_id));
  bottomItems.push(e('div', {
    key: 'domain',
    style: { display: 'flex', color: '#64748b', fontSize: 15, fontWeight: 600 }
  }, 'tnpropertymandi.in'));

  const content = e('div', {
    style: { display: 'flex', position: 'relative', width: '100%', height: '100%', background: '#0f172a' }
  },
    e('img', {
      src: imageUrl,
      style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }
    }),
    e('div', {
      style: { display: 'flex', position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)' }
    }),
    e('div', {
      style: { display: 'flex', flexDirection: 'column', position: 'absolute', left: 48, top: 0, bottom: 0, justifyContent: 'center', maxWidth: 520, gap: 10 }
    },
      location ? e('div', {
        style: { display: 'flex', alignItems: 'center', gap: 8, color: '#93c5fd', fontSize: 18, fontWeight: 600 }
      },
        e('div', { style: { display: 'flex', width: 8, height: 8, background: '#3b82f6', borderRadius: 4, flexShrink: 0 } }),
        e('span', null, location)
      ) : null,
      layoutOrLandmark ? e('div', {
        style: { display: 'flex', color: '#ffffff', fontSize: 38, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.5px' }
      }, layoutOrLandmark) : null,
      pills.length ? e('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 } }, ...pills) : null,
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 } }, ...bottomItems)
    )
  );

  return new ImageResponse(content, { width: 1200, height: 630 });
}
