import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getFlowOptions } from '../../../../../lib/services/admin/siteContent.service.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sale';
    const locale = searchParams.get('locale') || 'ta';
    const data = await getFlowOptions(type, locale);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
