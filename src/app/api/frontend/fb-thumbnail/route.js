import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  if (!url) return new NextResponse(null, { status: 400 });

  try {
    /* Fetch the FB video page as a crawler to get the og:image URL */
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
      redirect: 'follow',
    });
    const html = await pageRes.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (!match) return new NextResponse(null, { status: 404 });

    /* Proxy the image so the browser doesn't hit FB's hotlink protection */
    const imgRes = await fetch(match[1], {
      headers: {
        'Referer': 'https://www.facebook.com/',
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      },
    });
    if (!imgRes.ok) return new NextResponse(null, { status: 502 });

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await imgRes.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
