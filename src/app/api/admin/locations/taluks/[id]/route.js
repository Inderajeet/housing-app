import { NextResponse } from 'next/server';
import { getTaluksByDistrict, updateTaluk, bulkUpdateTalukCoords } from '../../../../../../lib/services/admin/location.service.js';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    if (searchParams.get('bulk') === 'coords') {
      const body = await request.json();
      const result = await bulkUpdateTalukCoords(body);
      return NextResponse.json(result);
    }
    const data = await getTaluksByDistrict(id);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await updateTaluk(id, body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
