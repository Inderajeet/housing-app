import prisma from '../../prisma.js';

export const getAll = async (type, enquiryType = null) => {
  let whereClause = '';
  const params = [];
  if (type === 'rent') whereClause = "WHERE p.property_type = 'rent'";
  else if (type === 'sale') whereClause = "WHERE p.property_type != 'rent'";
  if (enquiryType === 'buyer') {
    whereClause += whereClause ? ' AND e.buyer_id IS NOT NULL AND e.seller_id IS NULL' : 'WHERE e.buyer_id IS NOT NULL AND e.seller_id IS NULL';
  } else if (enquiryType === 'seller') {
    whereClause += whereClause ? ' AND e.seller_id IS NOT NULL AND e.buyer_id IS NULL' : 'WHERE e.seller_id IS NOT NULL AND e.buyer_id IS NULL';
  }
  const rows = await prisma.$queryRawUnsafe(`
    SELECT e.enquiry_id, e.property_id, e.enquiry_date, e.enquiry_type, e.contacted, e.booking_status,
      e.booking_date, e.confirmed_date, e.is_read,
      b.phone_number AS buyer_phone, b.name AS buyer_name, b.email AS buyer_email,
      s.phone_number AS seller_phone, s.name AS seller_name,
      p.title, p.property_type, p.status as main_property_status, p.formatted_id, p.contact_phone,
      rp.rent_status, rp.rent_amount, rp.bhk, rp.property_use,
      sp.sale_type,
      d.district_name, t.taluk_name, v.village_name,
      CASE WHEN p.property_type != 'rent' THEN sp.price ELSE rp.rent_amount END AS amount
    FROM enquiries e
    LEFT JOIN buyers b ON b.buyer_id = e.buyer_id
    LEFT JOIN sellers s ON s.seller_id = e.seller_id
    JOIN properties p ON p.property_id = e.property_id
    LEFT JOIN sale_properties sp ON sp.property_id = p.property_id
    LEFT JOIN rent_properties rp ON rp.property_id = p.property_id
    LEFT JOIN districts d ON d.district_id = p.district_id
    LEFT JOIN taluks t ON t.taluk_id = p.taluk_id
    LEFT JOIN villages v ON v.village_id = p.village_id
    ${whereClause}
    ORDER BY e.enquiry_date DESC
  `, ...params);
  return rows;
};

export const create = async (data) => {
  const rows = await prisma.$queryRawUnsafe(
    `INSERT INTO enquiries (property_id, buyer_id, seller_id, message, enquiry_type, booking_status, contacted)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    data.property_id || null, data.buyer_id || null, data.seller_id || null,
    data.message || null, data.enquiry_type || 'buyer', data.booking_status || 'enquired',
    data.contacted ?? false
  );
  return rows[0];
};

export const update = async (enquiryId, data) => {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE enquiries SET contacted=$1, booking_status=$2, booking_date=$3, confirmed_date=$4 WHERE enquiry_id=$5 RETURNING *`,
    data.contacted, data.booking_status, data.booking_date || null, data.confirmed_date || null, enquiryId
  );
  return rows[0];
};

export const markRead = async (enquiryId) => {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE enquiries SET is_read=true WHERE enquiry_id=$1 RETURNING *`,
    enquiryId
  );
  return rows[0];
};
