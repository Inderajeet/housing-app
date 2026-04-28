import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import prisma from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const rows = await prisma.$queryRawUnsafe(
      `UPDATE flat_units SET
        status=$1, token_amount=$2, token_paid_to=$3, advance_amount=$4,
        sold_rate=$5, sold_date=$6, document_number=$7
       WHERE flat_unit_id=$8 RETURNING *`,
      data.status || 'Nil Booking',
      data.token_amount || null,
      data.token_paid_to || null,
      data.advance_amount || null,
      data.sold_rate || null,
      data.sold_date || null,
      data.document_number || null,
      parseInt(id)
    );
    return NextResponse.json(rows[0]);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.$executeRawUnsafe('DELETE FROM flat_units WHERE flat_unit_id=$1', parseInt(id));
    return NextResponse.json({ success: true });
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
