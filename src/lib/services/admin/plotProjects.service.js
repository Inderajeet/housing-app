import prisma from '../../prisma.js';

export const getPlotProperties = async () => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT p.property_id, p.formatted_id, p.title, p.status, p.seller_id,
      p.contact_phone, p.address, p.latitude, p.longitude,
      s.phone_number AS seller_phone, s.name AS seller_name,
      sp.sale_type, sp.price, sp.rate_unit, sp.area_size, sp.survey_number, sp.layout_name,
      sp.token_amount, sp.token_paid_to, sp.sold_rate, sp.sold_date, sp.advance_amount,
      sp.dtcp, sp.sub_registrar_office,
      sp.alternate_contact_phone, sp.alternate_seller_name,
      sp.sale_status AS booking_status, p.created_at,
      d.district_name, t.taluk_name, v.village_name,
      COUNT(pu.plot_unit_id)::INT AS total_plots,
      COUNT(pu.plot_unit_id) FILTER (WHERE UPPER(pu.status) = 'NIL_BOOKING' OR pu.status = 'Nil Booking' OR pu.status IS NULL)::INT AS nil_booking_count,
      STRING_AGG(pu.plot_number, ',' ORDER BY pu.plot_number) FILTER (WHERE UPPER(pu.status) = 'NIL_BOOKING' OR pu.status = 'Nil Booking' OR pu.status IS NULL) AS nil_booking,
      COUNT(pu.plot_unit_id) FILTER (WHERE UPPER(pu.status) = 'ON_BOOKING')::INT AS on_booking_count,
      STRING_AGG(pu.plot_number, ',' ORDER BY pu.plot_number) FILTER (WHERE UPPER(pu.status) = 'ON_BOOKING') AS on_booking,
      COUNT(pu.plot_unit_id) FILTER (WHERE UPPER(pu.status) = 'CONFIRMED')::INT AS confirmed_count,
      STRING_AGG(pu.plot_number, ',' ORDER BY pu.plot_number) FILTER (WHERE UPPER(pu.status) = 'CONFIRMED') AS confirmed,
      COUNT(pu.plot_unit_id) FILTER (WHERE UPPER(pu.status) = 'UNREGISTERED')::INT AS unregistered_count,
      STRING_AGG(pu.plot_number, ',' ORDER BY pu.plot_number) FILTER (WHERE UPPER(pu.status) = 'UNREGISTERED') AS unregistered,
      COUNT(pu.plot_unit_id) FILTER (WHERE UPPER(pu.status) = 'REGISTERED')::INT AS registered_count,
      STRING_AGG(pu.plot_number, ',' ORDER BY pu.plot_number) FILTER (WHERE UPPER(pu.status) = 'REGISTERED') AS registered,
      COUNT(pu.plot_unit_id) FILTER (WHERE UPPER(pu.status) IN ('SOLD', 'RENTED'))::INT AS sold_count,
      STRING_AGG(pu.plot_number, ',' ORDER BY pu.plot_number) FILTER (WHERE UPPER(pu.status) IN ('SOLD', 'RENTED')) AS sold
    FROM properties p
    JOIN sale_properties sp ON sp.property_id = p.property_id AND sp.sale_type = 'plot'
    LEFT JOIN sellers s ON s.seller_id = p.seller_id
    LEFT JOIN plot_units pu ON pu.property_id = p.property_id
    LEFT JOIN districts d ON d.district_id = p.district_id
    LEFT JOIN taluks t ON t.taluk_id = p.taluk_id
    LEFT JOIN villages v ON v.village_id = p.village_id
    GROUP BY p.property_id, p.formatted_id, p.title, p.status, p.seller_id,
      p.contact_phone, p.address, p.latitude, p.longitude,
      s.phone_number, s.name, sp.sale_type, sp.price, sp.rate_unit, sp.area_size, sp.survey_number,
      sp.layout_name, sp.token_amount, sp.token_paid_to, sp.sold_rate, sp.sold_date,
      sp.advance_amount, sp.dtcp, sp.sub_registrar_office,
      sp.alternate_contact_phone, sp.alternate_seller_name, sp.sale_status, p.created_at,
      d.district_name, t.taluk_name, v.village_name
    ORDER BY p.property_id DESC
  `);
  return rows;
};

export const getOrCreateProject = async (propertyId) => {
  const existing = await prisma.$queryRawUnsafe('SELECT * FROM plot_projects WHERE property_id = $1', propertyId);
  if (existing.length) return existing[0];
  const rows = await prisma.$queryRawUnsafe(
    `INSERT INTO plot_projects (property_id, layout_name, total_plots) VALUES ($1, 'Layout', 0) RETURNING *`,
    propertyId
  );
  return rows[0];
};
