import prisma from '../../prisma.js';

export const getPlotProperties = async () => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT p.property_id, p.formatted_id, p.title, p.status, p.seller_id,
      s.phone_number AS seller_phone, sp.sale_type, p.created_at,
      COUNT(pu.plot_unit_id)::INT AS total_plots
    FROM properties p
    JOIN sale_properties sp ON sp.property_id = p.property_id AND sp.sale_type = 'plot'
    LEFT JOIN sellers s ON s.seller_id = p.seller_id
    LEFT JOIN plot_units pu ON pu.property_id = p.property_id
    GROUP BY p.property_id, p.formatted_id, p.title, p.status, p.seller_id, s.phone_number, sp.sale_type, p.created_at
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
