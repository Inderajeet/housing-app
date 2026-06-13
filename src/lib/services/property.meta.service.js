import prisma from '../prisma.js';

export async function getPropertyMeta(identifier) {
  if (!identifier) return null;

  const normalized = identifier.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!normalized) return null;
  const rawLower = identifier.toLowerCase().trim();

  // Step 1: get property + sale/rent data
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       p.property_id, p.property_type, p.formatted_id, p.title, p.description,
       p.latitude, p.longitude,
       p.area_speed, p.amenities_rating AS p_amenities_rating,
       p.utilities_rating AS p_utilities_rating, p.legal_rating,
       d.district_name, t.taluk_name, v.village_name,
       sp.sale_type, sp.layout_name, sp.price AS sale_price, sp.area_size,
       sp.rate_unit, sp.street_name_or_road_name,
       sp.legal_value, sp.area_sales_speed,
       sp.amenities_rating AS sp_amenities_rating,
       sp.utilities_rating AS sp_utilities_rating,
       sp.images AS sp_images,
       rp.bhk, rp.rent_amount, rp.property_use, rp.extent_area, rp.extent_unit,
       rp.landmark, rp.street_name,
       rp.amenities_rating AS rp_amenities_rating,
       rp.utilities_rating AS rp_utilities_rating,
       rp.images AS rp_images
     FROM properties p
     LEFT JOIN districts d ON d.district_id = p.district_id
     LEFT JOIN taluks t ON t.taluk_id = p.taluk_id
     LEFT JOIN villages v ON v.village_id = p.village_id
     LEFT JOIN sale_properties sp ON sp.property_id = p.property_id AND p.property_type = 'sale'
     LEFT JOIN rent_properties rp ON rp.property_id = p.property_id AND p.property_type = 'rent'
     WHERE p.status = 'approved'
       AND (
         REGEXP_REPLACE(LOWER(p.formatted_id), '[^a-z0-9]+', '-', 'g') = $1
         OR LOWER(p.formatted_id) = $2
         OR REGEXP_REPLACE(LOWER(p.title), '[^a-z0-9]+', '-', 'g') = $1
         OR LOWER(p.title) = $2
         OR p.property_id::text = $2
       )
     LIMIT 1`,
    normalized,
    rawLower
  );

  if (!rows[0]) return null;
  const row = rows[0];
  const propertyId = row.property_id;

  // Step 2: get primary image — try property_assets first, then JSON images field
  let primaryImage = null;
  try {
    const assetRows = await prisma.$queryRawUnsafe(
      `SELECT file_url FROM property_assets
       WHERE property_id = $1 AND file_url IS NOT NULL AND file_url != ''
       ORDER BY asset_id ASC LIMIT 1`,
      propertyId
    );
    if (assetRows[0]?.file_url) {
      primaryImage = assetRows[0].file_url;
    }
  } catch {
    // ignore — will fall back to JSON images
  }

  // Fallback: first URL from the sale_properties.images or rent_properties.images JSON
  if (!primaryImage) {
    const jsonImages = row.sp_images || row.rp_images;
    if (jsonImages) {
      try {
        const arr = Array.isArray(jsonImages) ? jsonImages : JSON.parse(jsonImages);
        const first = arr?.[0];
        if (first) {
          primaryImage = typeof first === 'string' ? first : (first.url || first.file_url || first.src || null);
        }
      } catch {
        // ignore
      }
    }
  }

  // Merge ratings: prefer sale/rent table values, fall back to properties table values
  return {
    ...row,
    primary_image: primaryImage,
    amenities_rating: row.sp_amenities_rating ?? row.rp_amenities_rating ?? row.p_amenities_rating,
    utilities_rating: row.sp_utilities_rating ?? row.rp_utilities_rating ?? row.p_utilities_rating,
    area_sales_speed: row.area_sales_speed ?? row.area_speed,
    legal_value: row.legal_value ?? (row.legal_rating != null ? String(row.legal_rating) : null),
  };
}
