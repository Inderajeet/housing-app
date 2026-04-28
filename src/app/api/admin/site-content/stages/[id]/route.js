import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { updateStage, deleteStage } from '../../../../../../lib/services/admin/siteContent.service.js';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = await updateStage(id, body);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const data = await deleteStage(id);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
