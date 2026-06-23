import { NextResponse } from 'next/server';
import { getTaluksByDistrict } from '@/lib/services/location.service';

export async function GET(request, { params }) {
  try {
    const { district_id } = await params;
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const data = await getTaluksByDistrict(district_id, { all });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
