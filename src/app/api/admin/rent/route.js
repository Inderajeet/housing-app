import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getAll, createRentProperty } from '../../../../lib/services/admin/rent.service.js';

export async function GET() {
  try {
    const data = await getAll();
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await createRentProperty(body);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
