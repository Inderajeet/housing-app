import prisma from '../prisma.js';

export async function getPremiumListings({ property_type, sale_type, property_use, bhk, district_id, taluk_id, village_id } = {}) {
  const values = [];
  const conditions = [`p.status = 'approved'`, `p.is_paid = TRUE`];

  if (property_type) { values.push(property_type.toLowerCase()); conditions.push(`p.property_type = $${values.length}`); }
  if (sale_type) { values.push(sale_type.toLowerCase()); conditions.push(`LOWER(sp.sale_type) = $${values.length}`); }
  if (property_use) { values.push(property_use.toLowerCase()); conditions.push(`LOWER(rp.property_use) = $${values.length}`); }
  if (bhk) {
    const bhkValue = String(bhk).trim().toLowerCase();
    if (bhkValue === '3' || bhkValue === '3+' || bhkValue === '3plus') {
      conditions.push(`CAST(rp.bhk AS INTEGER) >= 3`);
    } else {
      values.push(bhkValue); conditions.push(`CAST(rp.bhk AS TEXT) = $${values.length}`);
    }
  }
  if (district_id) { values.push(district_id); conditions.push(`p.district_id = $${values.length}`); }
  if (taluk_id) { values.push(taluk_id); conditions.push(`p.taluk_id = $${values.length}`); }
  if (village_id) { values.push(village_id); conditions.push(`p.village_id = $${values.length}`); }

  const whereClause = conditions.map(c => `(${c})`).join(' AND ');

  const sql = `
    SELECT p.property_id, p.formatted_id, p.property_type, p.title, p.description, p.status,
      p.latitude, p.longitude, p.created_at,
      d.district_id, d.district_name, t.taluk_id, t.taluk_name, v.village_id, v.village_name,
      pp.start_date, pp.end_date, pp.priority_order,
      sel.name AS seller_name, p.contact_phone AS seller_phone,
      sp.sale_type, sp.price AS sale_price, sp.area_size, sp.sale_status, sp.survey_number, sp.street_name_or_road_name,
      rp.bhk, rp.rent_amount, rp.advance_amount, rp.property_use, rp.furnished_status,
      rp.rent_status, rp.landmark, rp.street_name, rp.extent_area, rp.extent_unit,
      (SELECT JSON_AGG(JSON_BUILD_OBJECT('url', file_url)) FROM property_assets
       WHERE property_id = p.property_id AND asset_type = 'image') AS images
    FROM properties p
    INNER JOIN premium_properties pp ON pp.property_id = p.property_id
    LEFT JOIN sellers sel ON sel.seller_id = p.seller_id
    LEFT JOIN districts d ON d.district_id = p.district_id
    LEFT JOIN taluks t ON t.taluk_id = p.taluk_id
    LEFT JOIN villages v ON v.village_id = p.village_id
    LEFT JOIN sale_properties sp ON sp.property_id = p.property_id AND p.property_type = 'sale'
    LEFT JOIN rent_properties rp ON rp.property_id = p.property_id AND p.property_type = 'rent'
    WHERE ${whereClause}
    ORDER BY pp.priority_order DESC, pp.start_date ASC
  `;

  const rows = await prisma.$queryRawUnsafe(sql, ...values);
  return rows;
}
