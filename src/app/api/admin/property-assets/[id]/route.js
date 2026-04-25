import { NextResponse } from 'next/server';
import { uploadAsset, getAssets, deleteAsset } from '../../../../../lib/services/propertyAssets.service';
import { fileFromRequest } from '@/lib/uploadToCloudflare';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const data = await getAssets(id);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const assetType = formData.get('asset_type');
    const rawFile = formData.get('file');
    if (!rawFile || !(rawFile instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    const file = await fileFromRequest(rawFile);
    const result = await uploadAsset(id, assetType, file);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await deleteAsset(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
