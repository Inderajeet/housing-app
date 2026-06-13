import prisma from '../prisma.js';

function extractFirstImage(imagesJson) {
  if (!imagesJson) return null;
  try {
    const arr = Array.isArray(imagesJson) ? imagesJson : JSON.parse(imagesJson);
    if (!arr?.length) return null;
    const first = arr[0];
    return typeof first === 'string' ? first : (first?.url || first?.file_url || first?.src || null);
  } catch {
    return null;
  }
}

export async function getPropertyMeta(identifier) {
  if (!identifier) return null;

  const normalized = identifier.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!normalized) return null;

  for (const mode of ['sale', 'rent']) {
    const rows = await prisma.$queryRawUnsafe(
      mode === 'sale'
        ? `SELECT
             p.property_id, p.formatted_id, p.title, p.description,
             p.latitude, p.longitude, p.live_image,
             p.area_speed, p.amenities_rating, p.utilities_rating, p.legal_rating,
             d.district_name, t.taluk_name, v.village_name,
             sp.sale_type, sp.layout_name, sp.price AS sale_price, sp.area_size,
             sp.rate_unit, sp.street_name_or_road_name,
             sp.legal_value, sp.area_sales_speed,
             sp.amenities_rating AS sp_amenities_rating,
             sp.utilities_rating AS sp_utilities_rating,
             sp.images AS sp_images,
             (SELECT JSON_AGG(JSON_BUILD_OBJECT('url', file_url))
              FROM property_assets
              WHERE property_id = p.property_id AND asset_type = 'image') AS asset_images
           FROM properties p
           INNER JOIN sale_properties sp ON sp.property_id = p.property_id
           LEFT JOIN districts d ON d.district_id = p.district_id
           LEFT JOIN taluks t ON t.taluk_id = p.taluk_id
           LEFT JOIN villages v ON v.village_id = p.village_id
           WHERE p.status = 'approved' AND p.property_type = 'sale'
             AND (
               LOWER(p.formatted_id) = $1
               OR REGEXP_REPLACE(LOWER(p.formatted_id), '[^a-z0-9]+', '-', 'g') = $1
               OR LOWER(p.title) = $1
               OR p.property_id::text = $1
             )
           LIMIT 1`
        : `SELECT
             p.property_id, p.formatted_id, p.title, p.description,
             p.latitude, p.longitude, p.live_image,
             p.area_speed, p.amenities_rating, p.utilities_rating, p.legal_rating,
             d.district_name, t.taluk_name, v.village_name,
             rp.bhk, rp.rent_amount, rp.property_use, rp.extent_area, rp.extent_unit,
             rp.landmark, rp.street_name,
             rp.legal_value, rp.area_sales_speed,
             rp.amenities_rating AS sp_amenities_rating,
             rp.utilities_rating AS sp_utilities_rating,
             rp.images AS sp_images,
             NULL::text AS sale_type, NULL::text AS layout_name,
             NULL::numeric AS sale_price, NULL::text AS area_size,
             NULL::text AS rate_unit, NULL::text AS street_name_or_road_name,
             (SELECT JSON_AGG(JSON_BUILD_OBJECT('url', file_url))
              FROM property_assets
              WHERE property_id = p.property_id AND asset_type = 'image') AS asset_images
           FROM properties p
           INNER JOIN rent_properties rp ON rp.property_id = p.property_id
           LEFT JOIN districts d ON d.district_id = p.district_id
           LEFT JOIN taluks t ON t.taluk_id = p.taluk_id
           LEFT JOIN villages v ON v.village_id = p.village_id
           WHERE p.status = 'approved' AND p.property_type = 'rent'
             AND (
               LOWER(p.formatted_id) = $1
               OR REGEXP_REPLACE(LOWER(p.formatted_id), '[^a-z0-9]+', '-', 'g') = $1
               OR LOWER(p.title) = $1
               OR p.property_id::text = $1
             )
           LIMIT 1`,
      normalized
    );

    if (rows[0]) {
      const row = rows[0];
      // Image priority: property_assets → sp_images JSON → live_image on properties table
      const primary_image =
        extractFirstImage(row.asset_images) ||
        extractFirstImage(row.sp_images) ||
        row.live_image ||
        null;

      return {
        ...row,
        primary_image,
        amenities_rating: row.sp_amenities_rating ?? row.amenities_rating,
        utilities_rating: row.sp_utilities_rating ?? row.utilities_rating,
        area_sales_speed: row.area_sales_speed ?? row.area_speed,
      };
    }
  }

  return null;
}
