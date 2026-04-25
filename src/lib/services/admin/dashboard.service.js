import prisma from '../../prisma.js';

export const getStats = async () => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      -- Sale breakdown
      COUNT(DISTINCT p.property_id) FILTER (WHERE p.property_type = 'sale') AS total_sale,
      COUNT(DISTINCT p.seller_id) FILTER (WHERE p.property_type = 'sale') AS sale_sellers,
      (SELECT COUNT(DISTINCT e2.buyer_id) FROM enquiries e2
        JOIN properties p2 ON p2.property_id = e2.property_id
        WHERE p2.property_type = 'sale' AND e2.buyer_id IS NOT NULL) AS sale_buyers,
      (SELECT COUNT(*) FROM enquiries e3
        JOIN properties p3 ON p3.property_id = e3.property_id
        WHERE p3.property_type = 'sale') AS sale_enquiries,
      COUNT(DISTINCT sp.property_id) FILTER (WHERE sp.sale_type = 'plot') AS sale_plot,
      COUNT(DISTINCT sp.property_id) FILTER (WHERE sp.sale_type = 'flat') AS sale_flat,
      COUNT(DISTINCT sp.property_id) FILTER (WHERE sp.sale_type = 'land') AS sale_land,
      COUNT(DISTINCT sp.property_id) FILTER (WHERE sp.sale_type = 'house') AS sale_house,
      -- Rent breakdown
      COUNT(DISTINCT p.property_id) FILTER (WHERE p.property_type = 'rent') AS total_rent,
      COUNT(DISTINCT p.seller_id) FILTER (WHERE p.property_type = 'rent') AS rent_sellers,
      (SELECT COUNT(DISTINCT e4.buyer_id) FROM enquiries e4
        JOIN properties p4 ON p4.property_id = e4.property_id
        WHERE p4.property_type = 'rent' AND e4.buyer_id IS NOT NULL) AS rent_buyers,
      (SELECT COUNT(*) FROM enquiries e5
        JOIN properties p5 ON p5.property_id = e5.property_id
        WHERE p5.property_type = 'rent') AS rent_enquiries,
      (SELECT COUNT(*) FROM rent_properties WHERE bhk = 1 AND property_use = 'residential') AS rent_1bhk,
      (SELECT COUNT(*) FROM rent_properties WHERE bhk = 2 AND property_use = 'residential') AS rent_2bhk,
      (SELECT COUNT(*) FROM rent_properties
        WHERE bhk >= 3 AND property_use = 'residential') AS rent_3plus_bhk,
      (SELECT COUNT(*) FROM rent_properties WHERE property_use = 'commercial') AS rent_commercial
    FROM properties p
    LEFT JOIN sale_properties sp ON sp.property_id = p.property_id
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
