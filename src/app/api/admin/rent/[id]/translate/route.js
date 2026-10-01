import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { translateRentProperty } from '../../../../../../lib/services/admin/rent.service.js';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const result = await translateRentProperty(id);
    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
