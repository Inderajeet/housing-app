import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { updateService, deleteService } from '../../../../../../lib/services/admin/siteContent.service.js';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { text } = await request.json();
    const data = await updateService(id, text);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const data = await deleteService(id);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
