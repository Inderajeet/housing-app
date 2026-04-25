import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getAllDistricts, bulkUpdateDistrictCoords } from '../../../../../lib/services/admin/location.service.js';

export async function GET() {
  try {
    const data = await getAllDistricts();
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const result = await bulkUpdateDistrictCoords(Array.isArray(body) ? body : [body]);
    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
