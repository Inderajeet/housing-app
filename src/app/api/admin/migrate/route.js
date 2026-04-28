import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE booking_flow_services
         DROP CONSTRAINT IF EXISTS booking_flow_services_flow_type_check`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE booking_flow_services
         ADD CONSTRAINT booking_flow_services_flow_type_check
         CHECK (flow_type IN ('sale','rent','all','offer','sale_tick','sale_cross','rent_tick','rent_cross'))`
    );
    return NextResponse.json({ success: true, message: 'Migration applied — constraint updated.' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
