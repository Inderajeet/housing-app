import prisma from '../../prisma.js';

export const getAll = async (type = null, status = null) => {
  let where = [];
  const params = [];
  let i = 1;
  if (type && type !== 'all') { where.push(`b.unit_type = $${i++}`); params.push(type); }
  if (status) { where.push(`b.status = $${i++}`); params.push(status); }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await prisma.$queryRawUnsafe(`
    SELECT b.*,
      buy.name AS buyer_name, buy.phone_number AS buyer_phone,
      p.formatted_id, p.title AS property_title, p.property_type,
      pu.plot_number,
      sp.sale_type,
      rp.bhk, rp.property_use
    FROM bookings b
    LEFT JOIN buyers buy ON buy.buyer_id = b.buyer_id
    LEFT JOIN properties p ON p.property_id = b.property_id
    LEFT JOIN plot_units pu ON pu.plot_unit_id = b.unit_id AND b.unit_type = 'plot'
    LEFT JOIN sale_properties sp ON sp.property_id = b.property_id AND b.unit_type IN ('sale', 'plot', 'flat')
    LEFT JOIN rent_properties rp ON rp.property_id = b.property_id AND b.unit_type = 'rent'
    ${whereClause}
    ORDER BY b.booking_id DESC
  `, ...params);
  return rows;
};

export const getById = async (bookingId) => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT b.*, buy.name AS buyer_name, buy.phone_number AS buyer_phone,
      p.formatted_id, p.title AS property_title
    FROM bookings b
    LEFT JOIN buyers buy ON buy.buyer_id = b.buyer_id
    LEFT JOIN properties p ON p.property_id = b.property_id
    WHERE b.booking_id = $1
  `, bookingId);
  return rows[0] || null;
};

export const update = async (bookingId, data) => {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE bookings SET status=$1 WHERE booking_id=$2 RETURNING *`,
    data.status, bookingId
  );
  return rows[0];
};
