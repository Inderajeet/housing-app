import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getUnread } from '../../../../lib/services/admin/notifications.service.js';

export async function GET() {
  try {
    const data = await getUnread();
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
