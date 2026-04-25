import { NextResponse } from 'next/server';
import { getAll, createRentProperty } from '../../../../lib/services/admin/rent.service.js';

export async function GET() {
  try {
    const data = await getAll();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await createRentProperty(body);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
