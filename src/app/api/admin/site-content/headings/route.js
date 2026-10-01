import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getAllHeadings, updateHeading } from '../../../../../lib/services/admin/siteContent.service.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'ta';
    const data = await getAllHeadings(locale);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(request) {
  try {
    const { key, value, locale } = await request.json();
    const data = await updateHeading(key, value, locale || 'ta');
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
