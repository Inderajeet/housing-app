import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT fu.flat_unit_id, fu.property_id, fu.flat_number, fu.status,
        fu.token_amount, fu.token_paid_to, fu.advance_amount,
        fu.sold_rate, fu.sold_date, fu.document_number,
        fu.assigned_buyer_id,
        b.phone_number AS buyer_phone,
        sp.formatted_id AS property_formatted_id, sp.title AS property_title
      FROM flat_units fu
      LEFT JOIN buyers b ON b.buyer_id = fu.assigned_buyer_id
      LEFT JOIN properties sp ON sp.property_id = fu.property_id
      ORDER BY fu.property_id, fu.flat_number
    `);
    return NextResponse.json(rows);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
