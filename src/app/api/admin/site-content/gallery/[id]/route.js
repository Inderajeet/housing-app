import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { deleteGalleryImage, updateGalleryImage } from '@/lib/services/admin/siteContent.service';
import { deleteFromCloudflare } from '@/lib/uploadToCloudflare';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updateGalleryImage(id, body);
    return NextResponse.json(updated);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const deleted = await deleteGalleryImage(id);
    if (deleted?.image_url) {
      await deleteFromCloudflare(deleted.image_url);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
