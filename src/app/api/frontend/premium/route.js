import { NextResponse } from 'next/server';
import { getPremiumListings } from '@/lib/services/premium.service';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await getPremiumListings({
      property_type: searchParams.get('property_type'),
      sale_type: searchParams.get('sale_type'),
      property_use: searchParams.get('property_use'),
      bhk: searchParams.get('bhk'),
      district_id: searchParams.get('district_id'),
      taluk_id: searchParams.get('taluk_id'),
      village_id: searchParams.get('village_id'),
    });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
