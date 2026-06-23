import { NextResponse } from 'next/server';
import { getAllDistricts } from '@/lib/services/location.service';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const data = await getAllDistricts({ all });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
