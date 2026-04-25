import { NextResponse } from 'next/server';
import { getFlowByPhone } from '@/lib/services/booking.service';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await getFlowByPhone({
      propertyId: searchParams.get('propertyId'),
      unitType: searchParams.get('unitType'),
      unitId: searchParams.get('unitId'),
      phone: searchParams.get('phone'),
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
