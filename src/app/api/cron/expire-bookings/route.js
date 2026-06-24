import { NextResponse } from 'next/server';
import { expireOverdueBookings } from '@/lib/services/admin/expire-bookings.service';

export async function GET(request) {
  // Protect with CRON_SECRET so only the scheduler (or admin) can trigger it
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await expireOverdueBookings();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/expire-bookings]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Allow POST too so the admin panel can trigger it manually
export const POST = GET;
