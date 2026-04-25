import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getPlotProperties } from '../../../../lib/services/admin/plotProjects.service.js';

export async function GET() {
  try {
    const data = await getPlotProperties();
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
