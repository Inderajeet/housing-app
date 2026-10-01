import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { updateFlowOptionLabel } from '../../../../../../lib/services/admin/siteContent.service.js';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { label } = await request.json();
    const data = await updateFlowOptionLabel(id, label);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
