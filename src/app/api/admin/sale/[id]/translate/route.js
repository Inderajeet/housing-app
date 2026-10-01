import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { translateSaleProperty } from '../../../../../../lib/services/admin/sale.service.js';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const result = await translateSaleProperty(id);
    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
