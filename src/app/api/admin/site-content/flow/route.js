import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getBookingFlow, addStage } from '../../../../../lib/services/admin/siteContent.service.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sale';
    const data = await getBookingFlow(type);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request) {
  try {
    const { flowType, stageKey, title, timeframe, nextLabel } = await request.json();
    const data = await addStage(flowType, stageKey, title, timeframe, nextLabel);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
