import { NextResponse } from 'next/server';
import { getAllDistricts } from '@/lib/services/location.service';

export async function GET() {
  try {
    const data = await getAllDistricts();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
