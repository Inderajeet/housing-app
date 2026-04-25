import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getAll } from '../../../../lib/services/admin/buyers.service.js';

export async function GET() {
  try {
    const data = await getAll();
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
