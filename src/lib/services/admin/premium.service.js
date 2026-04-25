import prisma from '../../prisma.js';

export const getAllPremiumProperties = async ({ type, filter } = {}) => {
  const values = [];
  let typeFilter = '';
  if (type && type !== 'all') {
    values.push(type.toLowerCase());
    typeFilter = `AND p.property_type = $${values.length}`;
  }

  if (filter === 'requested') {
    const sql = `
      SELECT
        p.property_id, p.formatted_id, p.property_type, p.status, p.contact_phone, p.created_at,
        d.district_name, t.taluk_name, v.village_name,
        sp.sale_type, sp.price AS sale_price,
        rp.bhk, rp.rent_amount
      FROM properties p
      LEFT JOIN districts d ON d.district_id = p.district_id
      LEFT JOIN taluks t ON t.taluk_id = p.taluk_id
      LEFT JOIN villages v ON v.village_id = p.village_id
      LEFT JOIN sale_properties sp ON sp.property_id = p.property_id AND p.property_type = 'sale'
      LEFT JOIN rent_properties rp ON rp.property_id = p.property_id AND p.property_type = 'rent'
      WHERE p.premium_requested = TRUE AND p.is_paid = FALSE
      ${typeFilter}
      ORDER BY p.created_at DESC
    `;
    return await prisma.$queryRawUnsafe(sql, ...values);
  }

  const sql = `
    SELECT pp.id, pp.property_id, pp.start_date, pp.end_date, pp.priority_order,
      p.formatted_id, p.property_type, p.status, p.contact_phone,
      d.district_name, t.taluk_name, v.village_name,
      sp.sale_type, sp.price AS sale_price,
      rp.bhk, rp.rent_amount, rp.property_use,
      (SELECT file_url FROM property_assets WHERE property_id = p.property_id AND asset_type = 'image' LIMIT 1) AS first_image
    FROM premium_properties pp
    INNER JOIN properties p ON p.property_id = pp.property_id
    LEFT JOIN districts d ON d.district_id = p.district_id
    LEFT JOIN taluks t ON t.taluk_id = p.taluk_id
    LEFT JOIN villages v ON v.village_id = p.village_id
    LEFT JOIN sale_properties sp ON sp.property_id = p.property_id AND p.property_type = 'sale'
    LEFT JOIN rent_properties rp ON rp.property_id = p.property_id AND p.property_type = 'rent'
    WHERE 1=1 ${typeFilter}
    ORDER BY pp.priority_order DESC NULLS LAST, pp.start_date DESC NULLS LAST
  `;

  return await prisma.$queryRawUnsafe(sql, ...values);
};

export const requestPremium = async (property_id) => {
  const pid = parseInt(property_id);
  await prisma.$executeRawUnsafe(
    `UPDATE properties SET premium_requested = TRUE WHERE property_id = $1`,
    pid
  );
  return { property_id: pid, message: 'Premium requested' };
};

export const addToPremium = async ({ property_id, start_date, end_date, priority_order }) => {
  const pid = parseInt(property_id);
  const rows = await prisma.$queryRawUnsafe(
    `INSERT INTO premium_properties (property_id, start_date, end_date, priority_order)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (property_id) DO UPDATE
       SET start_date = EXCLUDED.start_date,
           end_date = EXCLUDED.end_date,
           priority_order = EXCLUDED.priority_order
     RETURNING *`,
    pid,
    start_date || null,
    end_date || null,
    priority_order ? parseInt(priority_order) : null
  );
  await prisma.$executeRawUnsafe(`UPDATE properties SET is_paid = TRUE WHERE property_id = $1`, pid);
  return rows[0];
};

export const updatePremium = async (id, { start_date, end_date, priority_order }) => {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE premium_properties SET start_date=$1, end_date=$2, priority_order=$3 WHERE id=$4 RETURNING *`,
    start_date || null,
    end_date || null,
    priority_order ? parseInt(priority_order) : null,
    parseInt(id)
  );
  if (!rows.length) throw new Error('Premium entry not found');
  return rows[0];
};

export const removeFromPremium = async (id) => {
  const rows = await prisma.$queryRawUnsafe(
    `DELETE FROM premium_properties WHERE id=$1 RETURNING property_id`,
    parseInt(id)
  );
  if (rows.length && rows[0].property_id) {
    await prisma.$executeRawUnsafe(
      `UPDATE properties SET is_paid = FALSE WHERE property_id = $1`,
      rows[0].property_id
    );
  }
  return rows[0] || null;
};
