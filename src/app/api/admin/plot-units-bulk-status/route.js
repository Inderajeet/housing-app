import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const parseLabels = (str) => {
  if (!str) return [];
  const nums = [];
  str.toString().split(',').map(p => p.trim()).forEach(part => {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      if (!isNaN(a) && !isNaN(b)) for (let i = Math.min(a, b); i <= Math.max(a, b); i++) nums.push(String(i));
    } else if (part) {
      nums.push(part);
    }
  });
  return nums;
};

export async function PUT(request) {
  try {
    const body = await request.json();
    const { property_id, nil_booking, on_booking, confirmed, unregistered, registered, sold } = body;
    if (!property_id) return NextResponse.json({ error: 'property_id required' }, { status: 400 });

    const updates = [
      { status: 'Nil Booking', labels: parseLabels(nil_booking) },
      { status: 'ON_BOOKING',  labels: parseLabels(on_booking) },
      { status: 'CONFIRMED',   labels: parseLabels(confirmed) },
      { status: 'UNREGISTERED',labels: parseLabels(unregistered) },
      { status: 'REGISTERED',  labels: parseLabels(registered) },
      { status: 'SOLD',        labels: parseLabels(sold) },
    ].filter(u => u.labels.length > 0);

    for (const { status, labels } of updates) {
      await prisma.$executeRawUnsafe(
        `UPDATE plot_units SET status = $1 WHERE property_id = $2 AND plot_number = ANY($3::varchar[])`,
        status, Number(property_id), labels
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
