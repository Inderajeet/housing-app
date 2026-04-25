import { NextResponse } from 'next/server';
import { getVillagesByTaluk } from '@/lib/services/location.service';

export async function GET(request, { params }) {
  try {
    const { taluk_id } = await params;
    const data = await getVillagesByTaluk(taluk_id);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
