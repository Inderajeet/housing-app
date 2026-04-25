import { NextResponse } from 'next/server';
import { getFlatProperties } from '../../../../lib/services/admin/flatProjects.service.js';

export async function GET() {
  try {
    const data = await getFlatProperties();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
