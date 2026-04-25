import prisma from '../prisma.js';
import { uploadToCloudflare } from '../uploadToCloudflare';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function uploadAsset(propertyId, assetType, file) {
  if (!file) throw new Error('No file received');
  if (file.size > MAX_FILE_SIZE) throw new Error(`File too large: ${file.size} bytes`);

  const cfResult = await uploadToCloudflare(propertyId, assetType, file);

  await prisma.$executeRawUnsafe(
    `INSERT INTO property_assets (property_id, asset_type, file_key, file_url, file_name, file_size, mime_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    propertyId, assetType, cfResult.key, cfResult.url, cfResult.file.originalname, cfResult.file.size, cfResult.file.mimetype
  );

  return { success: true, file_url: cfResult.url };
}

export async function getAssets(propertyId) {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT * FROM property_assets WHERE property_id = $1 ORDER BY asset_id ASC',
    propertyId
  );
  return rows;
}

export async function deleteAsset(assetId) {
  const rows = await prisma.$queryRawUnsafe(
    'DELETE FROM property_assets WHERE asset_id = $1 RETURNING *',
    assetId
  );
  return rows[0] || null;
}
