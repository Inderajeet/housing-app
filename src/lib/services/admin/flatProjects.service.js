import prisma from '../../prisma.js';

export const getFlatProperties = async () => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT p.property_id, p.formatted_id, p.title, p.status, p.seller_id, p.created_at,
      s.phone_number AS seller_phone, s.name AS seller_name, sp.sale_type,
      fp.flat_project_id, fp.layout_name, fp.total_flats,
      COUNT(fu.flat_unit_id)::INT AS unit_count
    FROM properties p
    JOIN sale_properties sp ON sp.property_id = p.property_id AND sp.sale_type = 'flat'
    LEFT JOIN sellers s ON s.seller_id = p.seller_id
    LEFT JOIN flat_projects fp ON fp.property_id = p.property_id
    LEFT JOIN flat_units fu ON fu.property_id = p.property_id
    GROUP BY p.property_id, p.formatted_id, p.title, p.status, p.seller_id, p.created_at,
      s.phone_number, s.name, sp.sale_type, fp.flat_project_id, fp.layout_name, fp.total_flats
    ORDER BY p.property_id DESC
  `);
  return rows;
};

export const getOrCreateProject = async (propertyId) => {
  const existing = await prisma.$queryRawUnsafe('SELECT * FROM flat_projects WHERE property_id = $1', propertyId);
  if (existing.length) return existing[0];
  const rows = await prisma.$queryRawUnsafe(
    `INSERT INTO flat_projects (property_id, layout_name, total_flats) VALUES ($1, 'Layout', 0) RETURNING *`,
    propertyId
  );
  return rows[0];
};
