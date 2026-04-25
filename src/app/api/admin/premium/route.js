import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getAllPremiumProperties, addToPremium, requestPremium } from '@/lib/services/admin/premium.service';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const filter = searchParams.get('filter');
    const data = await getAllPremiumProperties({ type, filter });
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (body.request_only) {
      const data = await requestPremium(body.property_id);
      return NextResponse.json(data, { status: 201 });
    }
    const data = await addToPremium(body);
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
