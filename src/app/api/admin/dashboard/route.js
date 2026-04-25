import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { getStats, getRecentEnquiries, getRentStatusBreakdown, getSaleStatusBreakdown } from '../../../../lib/services/admin/dashboard.service.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'stats';
    if (type === 'recent-enquiries') {
      const data = await getRecentEnquiries();
      return NextResponse.json(data);
    }
    if (type === 'rent-status') {
      const data = await getRentStatusBreakdown();
      return NextResponse.json(data);
    }
    if (type === 'sale-status') {
      const data = await getSaleStatusBreakdown();
      return NextResponse.json(data);
    }
    const data = await getStats();
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
