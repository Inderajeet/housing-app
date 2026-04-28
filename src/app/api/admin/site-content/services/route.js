import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getServices, addService } from '../../../../../lib/services/admin/siteContent.service.js';

export async function GET() {
  try {
    const data = await getServices();
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request) {
  try {
    const { stageKey, flowType, text, sortOrder } = await request.json();
    const data = await addService(stageKey, flowType, text, sortOrder);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
