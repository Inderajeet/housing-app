import path from 'path';
import sharp from 'sharp';

const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1920;
const IMAGE_QUALITY = 80;

async function buildCompressedFile(file) {
  if (!file || !file.buffer || !file.mimetype?.startsWith('image/')) return file;
  if (file.mimetype === 'image/svg+xml' || file.mimetype === 'image/gif') return file;

  const buffer = await sharp(file.buffer)
    .rotate()
    .resize({ width: MAX_IMAGE_WIDTH, height: MAX_IMAGE_HEIGHT, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: IMAGE_QUALITY })
    .toBuffer();

  const parsedName = path.parse(file.originalname || 'image');
  return { ...file, buffer, size: buffer.length, mimetype: 'image/webp', originalname: `${parsedName.name || 'image'}.webp` };
}

export async function uploadToCloudflare(propertyId, assetType, file) {
  if (!process.env.CF_WORKER_UPLOAD_URL) throw new Error('CF_WORKER_UPLOAD_URL not set');

  const compressedFile = await buildCompressedFile(file);
  const fd = new FormData();
  const blob = new Blob([compressedFile.buffer], { type: compressedFile.mimetype });

  fd.append('file', blob, compressedFile.originalname);
  fd.append('propertyId', propertyId.toString());
  fd.append('assetType', assetType);

  const cfRes = await fetch(process.env.CF_WORKER_UPLOAD_URL, { method: 'POST', body: fd });
  const data = await cfRes.json();
  if (!cfRes.ok) throw new Error(data.error || `Worker returned ${cfRes.status}`);

  return { key: data.key, url: data.url, file: compressedFile };
}

export async function deleteFromCloudflare(fileUrl) {
  if (!fileUrl || !process.env.CF_WORKER_UPLOAD_URL) return;
  try {
    const filename = new URL(fileUrl).pathname.split('/').pop();
    const deleteUrl = process.env.CF_WORKER_UPLOAD_URL.replace('/upload', `/files/${filename}`);
    await fetch(deleteUrl, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Failed to delete from Cloudflare:', err.message);
  }
}

export async function fileFromRequest(formDataFile) {
  const buffer = Buffer.from(await formDataFile.arrayBuffer());
  return { buffer, mimetype: formDataFile.type, originalname: formDataFile.name, size: formDataFile.size };
}
