import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getFrontendContent } from '../../../../lib/services/admin/siteContent.service.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sale';
    const data = await getFrontendContent(type);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
