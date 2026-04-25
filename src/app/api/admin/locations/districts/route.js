import { NextResponse } from 'next/server';
import { getAllDistricts, bulkUpdateDistrictCoords } from '../../../../../lib/services/admin/location.service.js';

export async function GET() {
  try {
    const data = await getAllDistricts();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const result = await bulkUpdateDistrictCoords(Array.isArray(body) ? body : [body]);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
