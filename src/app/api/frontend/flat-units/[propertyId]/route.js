import { NextResponse } from 'next/server';
import { getLayout } from '@/lib/services/flatLayout.service';

export async function GET(request, { params }) {
  try {
    const { propertyId } = await params;
    const data = await getLayout(propertyId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
