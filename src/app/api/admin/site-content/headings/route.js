import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getAllHeadings, updateHeading } from '../../../../../lib/services/admin/siteContent.service.js';

export async function GET() {
  try {
    const data = await getAllHeadings();
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(request) {
  try {
    const { key, value } = await request.json();
    const data = await updateHeading(key, value);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
