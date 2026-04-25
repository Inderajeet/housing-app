import prisma from '../../prisma.js';

export const getStats = async () => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(DISTINCT p.property_id) AS total_properties,
      COUNT(DISTINCT p.property_id) FILTER (WHERE p.property_type = 'rent') AS total_rent,
      COUNT(DISTINCT p.property_id) FILTER (WHERE p.property_type = 'sale') AS total_sale,
      COUNT(DISTINCT p.property_id) FILTER (WHERE p.property_type = 'plot') AS total_plot,
      COUNT(DISTINCT sp.property_id) FILTER (WHERE sp.sale_type = 'house') AS sale_house,
      COUNT(DISTINCT sp.property_id) FILTER (WHERE sp.sale_type = 'flat') AS sale_flat,
      COUNT(DISTINCT sp.property_id) FILTER (WHERE sp.sale_type = 'land') AS sale_land,
      COUNT(DISTINCT sp.property_id) FILTER (WHERE sp.sale_type = 'plot') AS sale_plot,
      COUNT(DISTINCT p.property_id) FILTER (WHERE p.status = 'active') AS status_active,
      COUNT(DISTINCT p.property_id) FILTER (WHERE p.status = 'approved') AS status_approved,
      COUNT(DISTINCT p.property_id) FILTER (WHERE p.status = 'Pending') AS status_pending,
      COUNT(DISTINCT p.property_id) FILTER (WHERE p.status = 'inactive') AS status_inactive,
      (SELECT COUNT(*) FROM sellers) AS total_sellers,
      (SELECT COUNT(*) FROM buyers) AS total_buyers,
      (SELECT COUNT(*) FROM enquiries) AS total_enquiries,
      COUNT(DISTINCT e.enquiry_id) FILTER (WHERE e.booking_status = 'enquired') AS enquiries_open,
      COUNT(DISTINCT e.enquiry_id) FILTER (WHERE e.booking_status = 'booked') AS enquiries_booked,
      COUNT(DISTINCT e.enquiry_id) FILTER (WHERE e.booking_status = 'confirmed') AS enquiries_confirmed,
      COUNT(DISTINCT e.enquiry_id) FILTER (WHERE e.booking_status = 'cancelled') AS enquiries_cancelled,
      (SELECT COUNT(*) FROM properties WHERE is_paid = TRUE) AS premium_active,
      (SELECT COUNT(*) FROM properties WHERE premium_requested = TRUE AND is_paid = FALSE) AS premium_pending
    FROM properties p
    LEFT JOIN sale_properties sp ON sp.property_id = p.property_id
    LEFT JOIN rent_properties rp ON rp.property_id = p.property_id
    LEFT JOIN enquiries e ON e.property_id = p.property_id
  `);
  return rows[0];
};

export const getRecentEnquiries = async () => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT e.enquiry_id, e.property_id, e.enquiry_date, e.booking_status, e.enquiry_type,
      p.formatted_id, p.title AS property_title, p.property_type,
      COALESCE(b.phone_number, s.phone_number) AS phone_number,
      COALESCE(b.name, s.name) AS contact_name
    FROM enquiries e
    JOIN properties p ON p.property_id = e.property_id
    LEFT JOIN buyers b ON b.buyer_id = e.buyer_id
    LEFT JOIN sellers s ON s.seller_id = e.seller_id
    ORDER BY e.enquiry_date DESC
    LIMIT 5
  `);
  return rows;
};

export const getRentStatusBreakdown = async () => {
  const rows = await prisma.$queryRawUnsafe(`SELECT rent_status AS status, COUNT(*) AS count FROM rent_properties GROUP BY rent_status ORDER BY count DESC`);
  return rows;
};

export const getSaleStatusBreakdown = async () => {
  const rows = await prisma.$queryRawUnsafe(`SELECT sale_status AS status, COUNT(*) AS count FROM sale_properties GROUP BY sale_status ORDER BY count DESC`);
  return rows;
};
