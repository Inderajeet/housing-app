import { NextResponse } from 'next/server';
import { getAll, listForDropdown, create } from '../../../../lib/services/admin/sellers.service.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    if (search !== null) {
      const data = await listForDropdown(search);
      return NextResponse.json(data);
    }
    const data = await getAll(type || null);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await create(body);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
