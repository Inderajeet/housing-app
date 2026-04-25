import prisma from '../../prisma.js';

export const getAll = async (type = null) => {
  let query, params = [];
  if (type === 'rent') {
    query = `SELECT s.*, COUNT(p.property_id)::INT AS property_count FROM sellers s INNER JOIN properties p ON p.seller_id = s.seller_id WHERE p.property_type = 'rent' GROUP BY s.seller_id ORDER BY s.name ASC`;
  } else if (type === 'sale') {
    query = `SELECT s.*, COUNT(p.property_id)::INT AS property_count FROM sellers s INNER JOIN properties p ON p.seller_id = s.seller_id WHERE p.property_type != 'rent' GROUP BY s.seller_id ORDER BY s.name ASC`;
  } else {
    query = `SELECT s.*, COUNT(p.property_id)::INT AS property_count FROM sellers s LEFT JOIN properties p ON p.seller_id = s.seller_id GROUP BY s.seller_id ORDER BY s.name ASC`;
  }
  const rows = await prisma.$queryRawUnsafe(query, ...params);
  return rows;
};

export const listForDropdown = async (search = '') => {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT seller_id, name, phone_number FROM sellers WHERE phone_number ILIKE $1 OR name ILIKE $1 ORDER BY seller_id DESC LIMIT 50`,
    `%${search}%`
  );
  return rows;
};

export const create = async (data) => {
  const rows = await prisma.$queryRawUnsafe(
    `INSERT INTO sellers (name, phone_number, alternate_phone, email, address) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    data.name, data.phone_number, data.alternate_phone || null, data.email || null, data.address || null
  );
  return rows[0];
};

export const update = async (sellerId, data) => {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE sellers SET name=$1, phone_number=$2, alternate_phone=$3, email=$4, address=$5 WHERE seller_id=$6 RETURNING *`,
    data.name, data.phone_number, data.alternate_phone || null, data.email || null, data.address || null, sellerId
  );
  return rows[0];
};

export const getSellerProperties = async (sellerId) => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT p.property_id, p.formatted_id, p.title, p.property_type,
      CASE WHEN p.property_type = 'sale' THEN s.price WHEN p.property_type = 'rent' THEN r.rent_amount END AS amount,
      CASE WHEN p.property_type = 'sale' THEN s.sale_status WHEN p.property_type = 'rent' THEN r.rent_status END AS status
    FROM properties p
    LEFT JOIN sale_properties s ON s.property_id = p.property_id
    LEFT JOIN rent_properties r ON r.property_id = p.property_id
    WHERE p.seller_id = $1
    ORDER BY p.property_id DESC
  `, sellerId);
  return rows;
};
