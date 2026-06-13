import sharp from 'sharp';
import { getPropertyMeta } from '@/lib/services/property.meta.service';

export const runtime = 'nodejs';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tnpropertymandi.in';

function x(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function trunc(str, maxLen) {
  const s = String(str ?? '');
  return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s;
}

async function fetchImageBase64(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    return { base64: Buffer.from(buf).toString('base64'), mime };
  } catch {
    return null;
  }
}

function buildSvg({ imgBase64, imgMime, loc, layout, info, legal, speed, amenities, locscore, isRent }) {
  const W = 1200, H = 630, IMG_H = 346;
  const CARD_Y = IMG_H, CARD_H = H - IMG_H;
  const PX = 50; // horizontal padding

  const imgSection = imgBase64
    ? `<image href="data:${imgMime};base64,${imgBase64}" x="0" y="0" width="${W}" height="${IMG_H}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="0" y="0" width="${W}" height="${IMG_H}" fill="#1e3a5f"/>
       <text x="${W / 2}" y="${IMG_H / 2 + 14}" text-anchor="middle" font-family="Arial,sans-serif" font-size="40" font-weight="700" fill="rgba(255,255,255,0.2)">TN Property Mandi</text>`;

  // Location | Layout row — combined on one line, truncated to fit
  const locStr  = trunc(loc, 35);
  const layoutStr = trunc(layout, 55);
  const sep = locStr && layoutStr ? '  |  ' : '';
  const locLayoutText = x(locStr + sep + layoutStr);

  // Rating boxes — 4 for sale, 2 for rent
  const boxW = isRent ? Math.floor((W - PX * 2) / 2) : Math.floor((W - PX * 2) / 4);
  const boxH = 84;
  const boxY = CARD_Y + CARD_H - boxH - 36; // bottom-aligned with brand below

  const boxes = isRent
    ? [
        { bg: '#d3a72f', label: 'AMENITIES', sub: 'rating', val: amenities, x: PX },
        { bg: '#ea580c', label: 'LOCATION',  sub: 'score',  val: locscore,  x: PX + boxW },
      ]
    : [
        { bg: '#24675e', label: 'LEGAL',    sub: 'grade',  val: legal,     x: PX },
        { bg: '#235bd8', label: 'AREA SALES', sub: 'speed', val: speed,    x: PX + boxW },
        { bg: '#d3a72f', label: 'AMENITIES', sub: 'rating', val: amenities, x: PX + boxW * 2 },
        { bg: '#ea580c', label: 'LOCATION',  sub: 'score',  val: locscore,  x: PX + boxW * 3 },
      ];

  const ratingsSvg = boxes.map(({ bg, label, sub, val, x: bx }) => `
    <rect x="${bx}" y="${boxY}" width="${boxW}" height="${boxH}" fill="${bg}"/>
    <text x="${bx + boxW / 2}" y="${boxY + 22}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="rgba(255,255,255,0.9)">${label}</text>
    <text x="${bx + boxW / 2}" y="${boxY + 38}" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="rgba(255,255,255,0.7)">${sub}</text>
    <text x="${bx + boxW / 2}" y="${boxY + 68}" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" font-weight="800" fill="#ffffff">${x(val)}</text>
  `).join('');

  // Separator line between photo and card
  const infoY = CARD_Y + 32;
  const lineY2 = boxY - 12;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <!-- photo -->
  ${imgSection}

  <!-- card background -->
  <rect x="0" y="${CARD_Y}" width="${W}" height="${CARD_H}" fill="#f0fdf4"/>

  <!-- pin dot -->
  <circle cx="${PX + 5}" cy="${infoY - 5}" r="5" fill="#3b82f6"/>

  <!-- location | layout -->
  <text x="${PX + 17}" y="${infoY}" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#1e293b">${locLayoutText}</text>

  <!-- info line -->
  ${info ? `<text x="${PX}" y="${infoY + 22}" font-family="Arial,sans-serif" font-size="13" fill="#64748b">${x(trunc(info, 80))}</text>` : ''}

  <!-- ratings -->
  ${ratingsSvg}

  <!-- brand -->
  <rect x="${PX}" y="${H - 28}" width="14" height="14" rx="3" fill="#24675e"/>
  <text x="${PX + 5}" y="${H - 18}" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" font-weight="800" fill="#ffffff">TN</text>
  <text x="${PX + 20}" y="${H - 17}" font-family="Arial,sans-serif" font-size="13" font-weight="600" fill="#64748b">tnpropertymandi.in</text>
</svg>`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const imgUrl    = searchParams.get('img') || '';
  const loc       = searchParams.get('loc') || '';
  const layout    = searchParams.get('layout') || '';
  const info      = searchParams.get('info') || '';
  const legal     = searchParams.get('legal') || '—';
  const speed     = searchParams.get('speed') || '—';
  const amenities = searchParams.get('amenities') || '—';
  const locscore  = searchParams.get('locscore') || '—';
  const isRent    = searchParams.get('rent') === '1';
  const identifier = searchParams.get('id') || '';

  // If no display data passed, try fetching from DB
  let finalLoc = loc, finalLayout = layout, finalInfo = info;
  let finalLegal = legal, finalSpeed = speed, finalAmenities = amenities, finalLocscore = locscore;
  let finalIsRent = isRent, finalImgUrl = imgUrl;

  if (!loc && identifier) {
    try {
      const p = await getPropertyMeta(identifier);
      if (p) {
        finalLoc = p.village_name || p.taluk_name || p.district_name || '';
        finalLayout = p.layout_name || p.title || '';
        finalIsRent = !!p.rent_amount;
        const saleType = (p.sale_type || '').toLowerCase();
        const typePart = finalIsRent
          ? ((p.property_use || '').toLowerCase() === 'commercial' ? 'Commercial' : p.bhk ? `${p.bhk} BHK` : 'Residential')
          : (saleType ? saleType.charAt(0).toUpperCase() + saleType.slice(1) : 'Property');
        finalInfo = [p.formatted_id, typePart].filter(Boolean).join(' / ');
        finalLegal = p.legal_value || '—';
        finalSpeed = p.area_sales_speed != null ? `${Number(p.area_sales_speed).toFixed(1)}/M` : '—';
        finalAmenities = p.amenities_rating != null ? `${Number(p.amenities_rating).toFixed(1)}/10` : '—';
        finalLocscore = p.utilities_rating != null ? `${Number(p.utilities_rating).toFixed(1)}/10` : '—';
        finalImgUrl = imgUrl || p.primary_image || '';
      }
    } catch { /* ignore */ }
  }

  // Fetch property image
  const imgData = finalImgUrl ? await fetchImageBase64(finalImgUrl) : null;

  const svg = buildSvg({
    imgBase64: imgData?.base64 || null,
    imgMime: imgData?.mime || 'image/jpeg',
    loc: finalLoc,
    layout: finalLayout,
    info: finalInfo,
    legal: finalLegal,
    speed: finalSpeed,
    amenities: finalAmenities,
    locscore: finalLocscore,
    isRent: finalIsRent,
  });

  try {
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[og/property] sharp error:', err?.message);
    // Final fallback: redirect to image or default
    const fallback = finalImgUrl || `${SITE_URL}/default-home.jpg`;
    return Response.redirect(fallback, 302);
  }
}
