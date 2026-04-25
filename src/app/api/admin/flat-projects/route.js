import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getFlatProperties } from '../../../../lib/services/admin/flatProjects.service.js';

export async function GET() {
  try {
    const data = await getFlatProperties();
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
