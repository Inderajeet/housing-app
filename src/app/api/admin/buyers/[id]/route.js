import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { update, getEnquiries } from '../../../../../lib/services/admin/buyers.service.js';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await update(id, body);
    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    if (searchParams.get('sub') === 'enquiries') {
      const data = await getEnquiries(id);
      return NextResponse.json(data);
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
