import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { updateSubtitle, deleteSubtitle } from '../../../../../../lib/services/admin/siteContent.service.js';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { text } = await request.json();
    const data = await updateSubtitle(id, text);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const data = await deleteSubtitle(id);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
