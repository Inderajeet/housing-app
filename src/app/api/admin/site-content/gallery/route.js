import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getGalleryImages, addGalleryImage } from '@/lib/services/admin/siteContent.service';
import { uploadToCloudflare, fileFromRequest } from '@/lib/uploadToCloudflare';

export async function GET() {
  try {
    const data = await getGalleryImages();
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request) {
  try {
    const existing = await getGalleryImages();
    if (existing.length >= 6) {
      return NextResponse.json({ error: 'Maximum 6 gallery images allowed' }, { status: 400 });
    }

    const formData = await request.formData();
    const rawFile = formData.get('file');
    if (!rawFile || !(rawFile instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const file = await fileFromRequest(rawFile);
    const { key, url } = await uploadToCloudflare('site', 'gallery', file);
    const sortOrder = existing.length;
    const caption = formData.get('caption') || '';
    const data = await addGalleryImage(url, key, sortOrder, caption);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
