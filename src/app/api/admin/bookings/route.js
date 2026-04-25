import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getAll } from '../../../../lib/services/admin/bookings.service.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const data = await getAll(type, status);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
