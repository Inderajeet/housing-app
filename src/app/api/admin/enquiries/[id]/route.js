import { NextResponse } from 'next/server';
import { update } from '../../../../../lib/services/admin/enquiries.service.js';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await update(id, body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
