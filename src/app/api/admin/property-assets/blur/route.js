import { NextResponse } from 'next/server';
import sharp from 'sharp';
import prisma from '@/lib/prisma';
import { uploadToCloudflare, deleteFromCloudflare } from '@/lib/uploadToCloudflare';

export async function POST(request) {
  try {
    const { asset_id, blur_regions } = await request.json();
    if (!asset_id || !Array.isArray(blur_regions) || blur_regions.length === 0) {
      return NextResponse.json({ error: 'asset_id and blur_regions required' }, { status: 400 });
    }

    const [asset] = await prisma.$queryRawUnsafe(
      'SELECT * FROM property_assets WHERE asset_id = $1',
      Number(asset_id)
    );
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

    // Download original image
    const imgRes = await fetch(asset.file_url);
    if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    const meta = await sharp(imgBuffer).metadata();
    const imgW = meta.width || 800;
    const imgH = meta.height || 600;

    // Build composite operations: for each region, extract → blur → composite back
    const compositeOps = [];
    for (const region of blur_regions) {
      const rx = Math.round(Math.max(0, region.x / 100 * imgW));
      const ry = Math.round(Math.max(0, region.y / 100 * imgH));
      const rw = Math.round(Math.min(imgW - rx, Math.max(1, region.w / 100 * imgW)));
      const rh = Math.round(Math.min(imgH - ry, Math.max(1, region.h / 100 * imgH)));
      if (rw < 1 || rh < 1) continue;

      const blurred = await sharp(imgBuffer)
        .extract({ left: rx, top: ry, width: rw, height: rh })
        .blur(20)
        .png()
        .toBuffer();

      compositeOps.push({ input: blurred, left: rx, top: ry });
    }

    const editedBuffer = compositeOps.length > 0
      ? await sharp(imgBuffer).composite(compositeOps).png().toBuffer()
      : imgBuffer;

    const file = {
      buffer: editedBuffer,
      mimetype: 'image/png',
      originalname: 'blur-edited.png',
      size: editedBuffer.length,
    };

    // Upload edited image
    const cfResult = await uploadToCloudflare(asset.property_id, asset.asset_type, file);

    // Insert new asset record
    await prisma.$executeRawUnsafe(
      `INSERT INTO property_assets (property_id, asset_type, file_key, file_url, file_name, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      asset.property_id, asset.asset_type,
      cfResult.key, cfResult.url,
      cfResult.file.originalname, cfResult.file.size, cfResult.file.mimetype
    );

    // Delete old asset (Cloudflare + DB)
    await deleteFromCloudflare(asset.file_url);
    await prisma.$executeRawUnsafe('DELETE FROM property_assets WHERE asset_id = $1', Number(asset_id));

    return NextResponse.json({ success: true, new_url: cfResult.url });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
