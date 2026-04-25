import { NextResponse } from 'next/server';
import { getById, updateRentProperty, updateRentStatus, deleteRentProperty } from '../../../../../lib/services/admin/rent.service.js';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const data = await getById(id);
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await deleteRentProperty(Number(id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (body.status && Object.keys(body).length === 1) {
      const result = await updateRentStatus(id, body.status);
      return NextResponse.json(result);
    }
    const result = await updateRentProperty(id, body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
