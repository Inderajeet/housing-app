import { NextResponse } from 'next/server';
import { getAll, updateRentProperty } from '@/lib/services/rent.service';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const data = await getAll(id);
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = await updateRentProperty(id, body);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
