import { NextResponse } from 'next/server';
import { bulkUpdateVillageCoords } from '../../../../../../lib/services/admin/location.service.js';

export async function PUT(request) {
  try {
    const body = await request.json();
    const result = await bulkUpdateVillageCoords(Array.isArray(body) ? body : [body]);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
