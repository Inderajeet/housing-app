import prisma from '../prisma.js';
import { uploadToCloudflare } from '../uploadToCloudflare';

export async function uploadAsset(propertyId, assetType, file) {
  if (!file) throw new Error('No file received');

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
  const deleted = rows[0] || null;

  // When a drawing is deleted, clear drawing_image on the owning property
  if (deleted?.asset_type === 'drawing' && deleted?.property_id) {
    const pid = deleted.property_id;
    await Promise.allSettled([
      prisma.$executeRawUnsafe(
        `UPDATE sale_properties SET drawing_image = NULL WHERE property_id = $1`, pid
      ),
      prisma.$executeRawUnsafe(
        `UPDATE rent_properties SET drawing_image = NULL WHERE property_id = $1`, pid
      ),
    ]);
  }

  return deleted;
}
