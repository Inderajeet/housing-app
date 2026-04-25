import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getLayout, saveLayout } from '../../../../../lib/services/admin/flatLayout.service.js';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const data = await getLayout(id);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { elements } = await request.json();
    const result = await saveLayout(id, elements || []);
    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
