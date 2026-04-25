import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getAll, create } from '../../../../lib/services/admin/enquiries.service.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const enquiryType = searchParams.get('enquiryType');
    const data = await getAll(type, enquiryType);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await create(body);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
