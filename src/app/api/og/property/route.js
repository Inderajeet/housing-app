import { getPropertyMeta } from '@/lib/services/property.meta.service';

export const runtime = 'nodejs';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tnpropertymandi.in';
const DEFAULT_IMAGE = `${SITE_URL}/default-home.jpg`;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const passedImg = searchParams.get('img') || '';
  const identifier = searchParams.get('id') || '';

  // Use passed image first (pre-fetched by generateMetadata)
  if (passedImg) {
    return Response.redirect(passedImg, 302);
  }

  // Fetch from DB as fallback
  try {
    const p = identifier ? await getPropertyMeta(identifier) : null;
    const imageUrl = p?.primary_image || DEFAULT_IMAGE;
    return Response.redirect(imageUrl, 302);
  } catch {
    return Response.redirect(DEFAULT_IMAGE, 302);
  }
}
