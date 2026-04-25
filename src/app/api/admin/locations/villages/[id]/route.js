import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getVillagesByTaluk, updateVillage, bulkUpdateVillageCoords } from '../../../../../../lib/services/admin/location.service.js';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const data = await getVillagesByTaluk(id);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (Array.isArray(body)) {
      const result = await bulkUpdateVillageCoords(body);
      return NextResponse.json(result);
    }
    const result = await updateVillage(id, body);
    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
