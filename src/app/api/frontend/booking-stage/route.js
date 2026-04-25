import { NextResponse } from 'next/server';
import { updateStage } from '@/lib/services/booking.service';

export async function POST(request) {
  try {
    const body = await request.json();
    await updateStage(body);
    return NextResponse.json({ success: true });
  } catch (err) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
