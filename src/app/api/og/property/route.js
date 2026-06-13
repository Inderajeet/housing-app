import sharp from 'sharp';
import { getPropertyMeta } from '@/lib/services/property.meta.service';

export const runtime = 'nodejs';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tnpropertymandi.in';
const W = 1200, H = 630, IMG_H = 346, CARD_H = 284;

function xe(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function trunc(str, max) {
  const s = String(str ?? '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function buildCardSvg({ loc, layout, info, legal, speed, amenities, locscore, isRent }) {
  const PX = 50;
  const locStr    = trunc(loc, 35);
  const layoutStr = trunc(layout, 50);
  const sep       = locStr && layoutStr ? '  |  ' : '';
  const locLine   = xe(locStr + sep + layoutStr);

  const numBoxes = isRent ? 2 : 4;
  const boxW = Math.floor((W - PX * 2) / numBoxes);
  const boxH = 84, boxY = CARD_H - boxH - 34;

  const boxDefs = isRent
    ? [
        { bg: '#d3a72f', label: 'AMENITIES', sub: 'rating', val: amenities },
        { bg: '#ea580c', label: 'LOCATION',  sub: 'score',  val: locscore  },
      ]
    : [
        { bg: '#24675e', label: 'LEGAL',      sub: 'grade', val: legal     },
        { bg: '#235bd8', label: 'AREA SALES', sub: 'speed', val: speed     },
        { bg: '#d3a72f', label: 'AMENITIES',  sub: 'rating', val: amenities },
        { bg: '#ea580c', label: 'LOCATION',   sub: 'score',  val: locscore  },
      ];

  const boxes = boxDefs.map(({ bg, label, sub, val }, i) => {
    const bx = PX + i * boxW;
    return `
      <rect x="${bx}" y="${boxY}" width="${boxW}" height="${boxH}" fill="${bg}"/>
      <text x="${bx + boxW / 2}" y="${boxY + 22}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="rgba(255,255,255,0.9)">${label}</text>
      <text x="${bx + boxW / 2}" y="${boxY + 38}" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="rgba(255,255,255,0.7)">${sub}</text>
      <text x="${bx + boxW / 2}" y="${boxY + 68}" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" font-weight="800" fill="#ffffff">${xe(val)}</text>`;
  }).join('');

  return `<svg width="${W}" height="${CARD_H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${CARD_H}" fill="#f0fdf4"/>
  <circle cx="${PX + 5}" cy="27" r="5" fill="#3b82f6"/>
  <text x="${PX + 17}" y="32" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#1e293b">${locLine}</text>
  ${info ? `<text x="${PX}" y="54" font-family="Arial,sans-serif" font-size="13" fill="#64748b">${xe(trunc(info, 80))}</text>` : ''}
  ${boxes}
  <rect x="${PX}" y="${CARD_H - 22}" width="14" height="14" rx="3" fill="#24675e"/>
  <text x="${PX + 5}" y="${CARD_H - 11}" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" font-weight="800" fill="#ffffff">TN</text>
  <text x="${PX + 21}" y="${CARD_H - 11}" font-family="Arial,sans-serif" font-size="12" font-weight="600" fill="#64748b">tnpropertymandi.in</text>
</svg>`;
}

async function fetchImg(url) {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TN-Property-OG/1.0)',
        'Accept': 'image/*,*/*',
      },
    });
    clearTimeout(t);
    if (!res.ok) {
      console.error('[og] image fetch failed:', res.status, url);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error('[og] image fetch error:', e?.message, url);
    return null;
  }
}

async function makePlaceholder(width, height, bg = { r: 30, g: 58, b: 95 }) {
  return sharp({ create: { width, height, channels: 3, background: bg } }).png().toBuffer();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let imgUrl     = searchParams.get('img') || '';
  let loc        = searchParams.get('loc') || '';
  let layout     = searchParams.get('layout') || '';
  let info       = searchParams.get('info') || '';
  let legal      = searchParams.get('legal') || '—';
  let speed      = searchParams.get('speed') || '—';
  let amenities  = searchParams.get('amenities') || '—';
  let locscore   = searchParams.get('locscore') || '—';
  let isRent     = searchParams.get('rent') === '1';
  const id       = searchParams.get('id') || '';

  if (!loc && id) {
    try {
      const p = await getPropertyMeta(id);
      if (p) {
        loc       = p.village_name || p.taluk_name || p.district_name || '';
        layout    = p.layout_name || p.title || '';
        isRent    = !!p.rent_amount;
        const st  = (p.sale_type || '').toLowerCase();
        const tp  = isRent
          ? ((p.property_use || '').toLowerCase() === 'commercial' ? 'Commercial' : p.bhk ? `${p.bhk} BHK` : 'Residential')
          : (st ? st.charAt(0).toUpperCase() + st.slice(1) : 'Property');
        info      = [p.formatted_id, tp].filter(Boolean).join(' / ');
        legal     = p.legal_value || '—';
        speed     = p.area_sales_speed != null ? `${Number(p.area_sales_speed).toFixed(1)}/M` : '—';
        amenities = p.amenities_rating  != null ? `${Number(p.amenities_rating).toFixed(1)}/10` : '—';
        locscore  = p.utilities_rating  != null ? `${Number(p.utilities_rating).toFixed(1)}/10` : '—';
        imgUrl    = imgUrl || p.primary_image || '';
      }
    } catch (e) {
      console.error('[og] DB fallback error:', e?.message);
    }
  }

  // Always return a 1200×630 PNG (never redirect — redirect causes portrait preview)
  try {
    // 1. Top section: property photo resized to 1200×346
    let topBuf;
    const rawImg = await fetchImg(imgUrl);
    if (rawImg) {
      try {
        topBuf = await sharp(rawImg)
          .resize(W, IMG_H, { fit: 'cover', position: 'centre' })
          .png()
          .toBuffer();
      } catch (e) {
        console.error('[og] top image resize error:', e?.message);
      }
    }
    if (!topBuf) {
      topBuf = await makePlaceholder(W, IMG_H);
    }

    // 2. Bottom section: ratings card SVG → PNG (1200×284)
    let cardBuf;
    try {
      const cardSvg = buildCardSvg({ loc, layout, info, legal, speed, amenities, locscore, isRent });
      cardBuf = await sharp(Buffer.from(cardSvg)).png().toBuffer();
    } catch (e) {
      console.error('[og] card SVG error:', e?.message);
      cardBuf = await makePlaceholder(W, CARD_H, { r: 240, g: 253, b: 244 });
    }

    // 3. Composite into 1200×630
    const final = await sharp({
      create: { width: W, height: H, channels: 3, background: { r: 248, g: 250, b: 252 } },
    })
      .composite([
        { input: topBuf,  top: 0,     left: 0 },
        { input: cardBuf, top: IMG_H, left: 0 },
      ])
      .png()
      .toBuffer();

    return new Response(final, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (err) {
    console.error('[og/property] fatal error:', err?.message);
    // Last-resort: return a 1200×630 solid-color PNG (NOT a redirect)
    try {
      const fallback = await sharp({
        create: { width: W, height: H, channels: 3, background: { r: 30, g: 58, b: 95 } },
      }).png().toBuffer();
      return new Response(fallback, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' },
      });
    } catch {
      return new Response('Error generating image', { status: 500 });
    }
  }
}
