import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { addSubtitle } from '../../../../../lib/services/admin/siteContent.service.js';

export async function POST(request) {
  try {
    const { stageId, text, sortOrder } = await request.json();
    const data = await addSubtitle(stageId, text, sortOrder);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
