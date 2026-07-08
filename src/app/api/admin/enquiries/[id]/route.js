import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { update, markRead } from '../../../../../lib/services/admin/enquiries.service.js';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await update(id, body);
    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const result = await markRead(id);
    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
