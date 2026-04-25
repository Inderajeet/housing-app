import { NextResponse } from 'next/server';
import { uploadAsset } from '@/lib/services/propertyAssets.service';
import { fileFromRequest } from '@/lib/uploadToCloudflare';

export async function POST(request, { params }) {
  try {
    const { propertyId } = await params;
    const formData = await request.formData();
    const assetType = formData.get('asset_type');
    const rawFile = formData.get('file');
    if (!rawFile || !(rawFile instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    const file = await fileFromRequest(rawFile);
    const result = await uploadAsset(propertyId, assetType, file);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
