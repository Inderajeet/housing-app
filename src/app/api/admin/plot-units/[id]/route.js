import { NextResponse } from 'next/server';
import { getLayout, saveLayout } from '../../../../../lib/services/admin/plotLayout.service.js';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const data = await getLayout(id);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { elements } = await request.json();
    const result = await saveLayout(id, elements || []);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
