import { NextResponse } from 'next/server';
import { getVillagesByTaluk, updateVillage, bulkUpdateVillageCoords } from '../../../../../../lib/services/admin/location.service.js';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const data = await getVillagesByTaluk(id);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
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
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
