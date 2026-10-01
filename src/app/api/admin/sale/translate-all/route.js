import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { translateAllSaleProperties } from '../../../../../lib/services/admin/sale.service.js';

export async function POST() {
  try {
    const result = await translateAllSaleProperties();
    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
