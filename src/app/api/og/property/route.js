import sharp from 'sharp';
import { getPropertyMeta } from '@/lib/services/property.meta.service';

export const runtime = 'nodejs';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tnpropertymandi.in';
const W = 1200, H = 628;  // 628 = WhatsApp's preferred OG height (exactly 1200/1.91)
const IMG_H = 428;
const CARD_H = 200;

// In-memory cache so WhatsApp/bots get instant response on repeat fetches
const ogCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

function xe(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function trunc(str, max) {
  const s = String(str ?? '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function buildCardSvg({ loc, layout, info, legal, speed, amenities, locscore, isRent }) {
  const PX = 48;

  // Line 1: location  |  layout/landmark
  const locStr    = trunc(loc, 30);
  const layoutStr = trunc(layout, 45);
  const sep       = locStr && layoutStr ? '   |   ' : '';
  const line1     = xe(locStr + sep + layoutStr);

  // Line 2: property info (formatted_id / type)
  const line2     = xe(trunc(info, 80));

  // Rating boxes — fill bottom of card
  const numBoxes = isRent ? 2 : 4;
  const boxW = Math.floor((W - PX * 2) / numBoxes);
  const boxH = 84;
  const boxY = 62;  // pushed down to give room for larger header text

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
      <text x="${bx + boxW / 2}" y="${boxY + 20}" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="rgba(255,255,255,0.9)">${label}</text>
      <text x="${bx + boxW / 2}" y="${boxY + 35}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="rgba(255,255,255,0.75)">${sub}</text>
      <text x="${bx + boxW / 2}" y="${boxY + 68}" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="800" fill="#ffffff">${xe(val)}</text>`;
  }).join('');

  // Brand row sits below boxes
  const brandY = boxY + boxH + 10;

  return `<svg width="${W}" height="${CARD_H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${CARD_H}" fill="#f0fdf4"/>

  <!-- Location pin icon (circle + stem) -->
  <circle cx="${PX + 7}" cy="20" r="7" fill="#3b82f6"/>
  <line x1="${PX + 7}" y1="27" x2="${PX + 7}" y2="36" stroke="#3b82f6" stroke-width="2"/>

  <!-- Line 1: location | layout -->
  <text x="${PX + 22}" y="26" font-family="Arial,sans-serif" font-size="19" font-weight="700" fill="#1e293b">${line1}</text>

  <!-- Line 2: formatted_id / type -->
  ${line2 ? `<text x="${PX + 22}" y="48" font-family="Arial,sans-serif" font-size="15" fill="#64748b">${line2}</text>` : ''}

  ${boxes}

  <!-- Brand -->
  <rect x="${PX}" y="${brandY}" width="18" height="18" rx="3" fill="#24675e"/>
  <text x="${PX + 9}" y="${brandY + 13}" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" font-weight="800" fill="#ffffff">TN</text>
  <text x="${PX + 26}" y="${brandY + 13}" font-family="Arial,sans-serif" font-size="13" font-weight="600" fill="#64748b">tnpropertymandi.in</text>
</svg>`;
}

async function fetchImg(url) {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000);
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

async function solidJpeg(width, height, bg) {
  return sharp({ create: { width, height, channels: 3, background: bg } }).jpeg({ quality: 80 }).toBuffer();
}

function ogResponse(buf, maxAge = 3600) {
  return new Response(buf, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
    },
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const cacheKey = request.url;
  let imgUrl    = searchParams.get('img') || '';
  let loc       = searchParams.get('loc') || '';
  let layout    = searchParams.get('layout') || '';
  let info      = searchParams.get('info') || '';
  let legal     = searchParams.get('legal') || '-';
  let speed     = searchParams.get('speed') || '-';
  let amenities = searchParams.get('amenities') || '-';
  let locscore  = searchParams.get('locscore') || '-';
  let isRent    = searchParams.get('rent') === '1';
  const id      = searchParams.get('id') || '';

  // Serve from cache instantly if available
  const hit = ogCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return ogResponse(hit.buf);
  }

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
        legal     = p.legal_value || '-';
        speed     = p.area_sales_speed != null ? `${Number(p.area_sales_speed).toFixed(1)}/M` : '-';
        amenities = p.amenities_rating  != null ? `${Number(p.amenities_rating).toFixed(1)}/10` : '-';
        locscore  = p.utilities_rating  != null ? `${Number(p.utilities_rating).toFixed(1)}/10` : '-';
        imgUrl    = imgUrl || p.primary_image || '';
      }
    } catch (e) {
      console.error('[og] DB error:', e?.message);
    }
  }

  try {
    // ── Fetch image + generate card in parallel ───────────────────────────
    const [topBuf, cardBuf] = await Promise.all([
      // Top photo
      (async () => {
        try {
          const raw = await fetchImg(imgUrl);
          if (raw) {
            return await sharp(raw)
              .resize(W, IMG_H, { fit: 'cover', position: 'centre' })
              .jpeg({ quality: 82 })
              .toBuffer();
          }
        } catch (e) {
          console.error('[og] image error:', e?.message);
        }
        return solidJpeg(W, IMG_H, { r: 30, g: 58, b: 95 });
      })(),
      // Ratings card SVG → PNG
      (async () => {
        try {
          const svg = buildCardSvg({ loc, layout, info, legal, speed, amenities, locscore, isRent });
          return await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
        } catch (e) {
          console.error('[og] card SVG error:', e?.message);
          return solidJpeg(W, CARD_H, { r: 240, g: 253, b: 244 });
        }
      })(),
    ]);

    // ── Composite 1200×630 ───────────────────────────────────────────────
    const final = await sharp({
      create: { width: W, height: H, channels: 3, background: { r: 248, g: 250, b: 252 } },
    })
      .composite([
        { input: topBuf,  top: 0,     left: 0 },
        { input: cardBuf, top: IMG_H, left: 0 },
      ])
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    ogCache.set(cacheKey, { buf: final, ts: Date.now() });
    return ogResponse(final);
  } catch (err) {
    console.error('[og/property] fatal:', err?.message);
    try {
      const fb = await solidJpeg(W, H, { r: 30, g: 58, b: 95 });
      return ogResponse(fb, 60);
    } catch {
      return new Response('Error', { status: 500 });
    }
  }
}
