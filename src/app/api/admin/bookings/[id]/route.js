import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { markRead } from '../../../../../lib/services/admin/bookings.service.js';

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
