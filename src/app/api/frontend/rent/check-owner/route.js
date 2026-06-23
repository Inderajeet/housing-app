import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = String(searchParams.get('phone') || '').replace(/\D/g, '').slice(0, 10);
    if (!phone) {
      return NextResponse.json({ exists: false });
    }

    const rows = await prisma.$queryRawUnsafe(
      `SELECT s.seller_id, s.name, s.phone_number
       FROM sellers s
       INNER JOIN properties p ON p.seller_id = s.seller_id AND p.property_type = 'rent'
       WHERE s.phone_number = $1
       LIMIT 1`,
      phone
    );

    if (!rows.length) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      seller_id: rows[0].seller_id,
      name: rows[0].name,
      phone_number: rows[0].phone_number,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
