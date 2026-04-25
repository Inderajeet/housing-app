import { NextResponse } from 'next/server';
import { getPlotProperties } from '../../../../lib/services/admin/plotProjects.service.js';

export async function GET() {
  try {
    const data = await getPlotProperties();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
