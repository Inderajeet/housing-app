import { NextResponse } from 'next/server';
import { getNotes, createNote } from '@/lib/services/admin/contactNotes.service.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      buyer_id: searchParams.get('buyer_id'),
      seller_id: searchParams.get('seller_id'),
      property_id: searchParams.get('property_id'),
      enquiry_id: searchParams.get('enquiry_id'),
      booking_id: searchParams.get('booking_id'),
    };
    const data = await getNotes(params);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await createNote(body);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
