import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { translateAllRentProperties } from '../../../../../lib/services/admin/rent.service.js';

export async function POST() {
  try {
    const result = await translateAllRentProperties();
    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
