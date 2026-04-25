import { NextResponse } from 'next/server';
import { getGeneralFlow } from '@/lib/services/booking.service';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await getGeneralFlow({
      propertyId: searchParams.get('propertyId'),
      unitType: searchParams.get('unitType'),
      unitId: searchParams.get('unitId'),
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
