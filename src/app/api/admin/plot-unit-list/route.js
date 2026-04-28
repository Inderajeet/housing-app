import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT pu.plot_unit_id, pu.property_id, pu.plot_number, pu.status,
        pu.token_amount, pu.token_paid_to, pu.advance_amount,
        pu.sold_rate, pu.sold_date, pu.document_number,
        pu.assigned_buyer_id,
        b.phone_number AS buyer_phone,
        sp.formatted_id AS property_formatted_id, sp.title AS property_title
      FROM plot_units pu
      LEFT JOIN buyers b ON b.buyer_id = pu.assigned_buyer_id
      LEFT JOIN properties sp ON sp.property_id = pu.property_id
      ORDER BY pu.property_id, pu.plot_number
    `);
    return NextResponse.json(rows);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
