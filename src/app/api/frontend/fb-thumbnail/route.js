import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

const fetchThumbnailBuffer = unstable_cache(
  async (videoUrl) => {
    const pageRes = await fetch(videoUrl, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
      redirect: 'follow',
    });
    const html = await pageRes.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (!match) return null;

    const imgRes = await fetch(match[1], {
      headers: {
        'Referer': 'https://www.facebook.com/',
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      },
    });
    if (!imgRes.ok) return null;

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    return { buffer: buffer.toString('base64'), contentType };
  },
  ['fb-thumbnail'],
  { revalidate: 86400 } /* re-fetch from FB once per 24h server-side */
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  if (!url) return new NextResponse(null, { status: 400 });

  try {
    const result = await fetchThumbnailBuffer(url);
    if (!result) return new NextResponse(null, { status: 404 });

    const buffer = Buffer.from(result.buffer, 'base64');
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': result.contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
