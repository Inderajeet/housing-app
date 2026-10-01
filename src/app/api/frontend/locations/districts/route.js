import { NextResponse } from 'next/server';
import { getAllDistricts } from '@/lib/services/location.service';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const type = searchParams.get('type') || '';
    const category = searchParams.get('category') || '';
    const data = await getAllDistricts({ all, type, category });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
