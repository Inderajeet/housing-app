import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getById, updateSaleProperty, updateSaleStatus, removeSaleProperty, updateDrawingImage, updateDrawingImageByUrl } from '../../../../../lib/services/admin/sale.service.js';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const data = await getById(id);
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('drawing_image');
      const result = await updateDrawingImage(id, file);
      return NextResponse.json(result);
    }
    const body = await request.json();
    if ('drawing_image_url' in body && Object.keys(body).length === 1) {
      const result = await updateDrawingImageByUrl(id, body.drawing_image_url);
      return NextResponse.json(result);
    }
    if (body.status && Object.keys(body).length === 1) {
      const result = await updateSaleStatus(id, body.status);
      return NextResponse.json(result);
    }
    const result = await updateSaleProperty(id, body);
    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const result = await removeSaleProperty(id);
    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
