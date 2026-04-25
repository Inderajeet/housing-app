import { NextResponse } from 'next/server';
import { update, getSellerProperties } from '../../../../../lib/services/admin/sellers.service.js';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await update(id, body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    if (searchParams.get('sub') === 'properties') {
      const data = await getSellerProperties(id);
      return NextResponse.json(data);
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
