import { NextResponse } from 'next/server';
import { submitContactRequest } from '@/lib/services/booking.service';

export async function POST(request) {
  try {
    const body = await request.json();
    const data = await submitContactRequest(body);
    return NextResponse.json({ success: true, ...data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
