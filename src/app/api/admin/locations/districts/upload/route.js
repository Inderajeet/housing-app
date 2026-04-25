import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import { uploadDistrictsFromBuffer } from '../../../../../../lib/services/admin/location.service.js';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadDistrictsFromBuffer(buffer);
    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
