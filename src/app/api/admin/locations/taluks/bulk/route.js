import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { bulkUpdateTalukCoords } from '../../../../../../lib/services/admin/location.service.js';

export async function PUT(request) {
  try {
    const body = await request.json();
    const result = await bulkUpdateTalukCoords(Array.isArray(body) ? body : [body]);
    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
