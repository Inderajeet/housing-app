import { NextResponse } from 'next/server';
import { uploadVillagesFromBuffer } from '../../../../../../lib/services/admin/location.service.js';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadVillagesFromBuffer(buffer);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
