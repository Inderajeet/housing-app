import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { updatePremium, removeFromPremium } from '@/lib/services/admin/premium.service';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = await updatePremium(id, body);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const data = await removeFromPremium(id);
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
