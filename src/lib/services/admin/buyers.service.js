import prisma from '../../prisma.js';

export const getAll = async () => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT ON (b.buyer_id)
      b.*,
      COUNT(e.enquiry_id) OVER(PARTITION BY b.buyer_id)::int AS enquiry_count
    FROM buyers b
    INNER JOIN enquiries e ON e.buyer_id = b.buyer_id
    INNER JOIN properties p ON p.property_id = e.property_id
    WHERE p.property_type != 'rent'
    ORDER BY b.buyer_id DESC, b.created_at DESC
  `);
  return rows;
};

export const update = async (buyerId, data) => {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE buyers SET name=$1, phone_number=$2, email=$3, address=$4 WHERE buyer_id=$5 RETURNING *`,
    data.name, data.phone_number, data.email || null, data.address || null, buyerId
  );
  return rows[0];
};

export const getEnquiries = async (buyerId) => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT e.enquiry_id, p.title, p.property_type, p.formatted_id,
      CASE WHEN p.property_type != 'rent' THEN sp.price ELSE rp.rent_amount END AS amount,
      e.enquiry_date
    FROM enquiries e
    JOIN properties p ON p.property_id = e.property_id
    LEFT JOIN sale_properties sp ON sp.property_id = p.property_id
    LEFT JOIN rent_properties rp ON rp.property_id = p.property_id
    WHERE e.buyer_id = $1 AND p.property_type != 'rent'
    ORDER BY e.enquiry_date DESC
  `, buyerId);
  return rows;
};
