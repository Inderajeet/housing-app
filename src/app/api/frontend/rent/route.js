import { NextResponse } from 'next/server';
import { getAll, createRentProperty } from '@/lib/services/rent.service';

export async function GET() {
  try {
    const data = await getAll(null);
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const data = await createRentProperty(body);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
