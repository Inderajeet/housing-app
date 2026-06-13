import prisma from '../prisma.js';

// Lightweight query for metadata only — fetches a single property by its URL identifier
export async function getPropertyMeta(identifier) {
  if (!identifier) return null;

  // Normalize for matching: lowercase, non-alphanumeric → hyphen
  const normalized = identifier.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!normalized) return null;

  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       p.formatted_id, p.title, p.description,
       p.latitude, p.longitude,
       d.district_name, t.taluk_name, v.village_name,
       sp.sale_type, sp.layout_name, sp.price AS sale_price, sp.area_size,
       sp.rate_unit, sp.street_name_or_road_name,
       sp.legal_value, sp.area_sales_speed,
       COALESCE(sp.amenities_rating, rp.amenities_rating) AS amenities_rating,
       COALESCE(sp.utilities_rating, rp.utilities_rating) AS utilities_rating,
       rp.bhk, rp.rent_amount, rp.property_use, rp.extent_area, rp.extent_unit,
       rp.landmark, rp.street_name,
       (SELECT file_url FROM property_assets
        WHERE property_id = p.property_id AND asset_type = 'image' LIMIT 1) AS primary_image
     FROM properties p
     LEFT JOIN districts d ON d.district_id = p.district_id
     LEFT JOIN taluks t ON t.taluk_id = p.taluk_id
     LEFT JOIN villages v ON v.village_id = p.village_id
     LEFT JOIN sale_properties sp ON sp.property_id = p.property_id AND p.property_type = 'sale'
     LEFT JOIN rent_properties rp ON rp.property_id = p.property_id AND p.property_type = 'rent'
     WHERE p.status = 'approved'
       AND REGEXP_REPLACE(LOWER(p.formatted_id), '[^a-z0-9]+', '-', 'g') = $1
     LIMIT 1`,
    normalized
  );

  return rows[0] || null;
}
