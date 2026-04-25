import { NextResponse } from 'next/server';
import { getAll } from '../../../../lib/services/admin/buyers.service.js';

export async function GET() {
  try {
    const data = await getAll();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
