import prisma from '../../prisma.js';

export const getLayout = async (propertyId) => {
  const plots = await prisma.$queryRawUnsafe(`
    SELECT plot_unit_id, plot_number, status, assigned_buyer_id,
      COALESCE((SELECT COUNT(DISTINCT b.buyer_id)::INT FROM bookings b WHERE b.unit_type = 'plot' AND b.unit_id = plot_units.plot_unit_id), 0) AS booked_people_count
    FROM plot_units WHERE property_id = $1 ORDER BY plot_number
  `, propertyId);
  const elements = await prisma.$queryRawUnsafe(`
    SELECT element_id, type, name, x, y, width, height, rotation, color, font_size, font_weight, visible
    FROM plot_layout_elements WHERE property_id = $1
  `, propertyId);
  const propRows = await prisma.$queryRawUnsafe(`
    SELECT drawing_image, total_units_count, booked_units, open_units
    FROM sale_properties WHERE property_id = $1
  `, propertyId);
  const prop = propRows[0] || {};
  return {
    items: [
      ...plots.map(p => ({ ...p, type: 'PLOT', visible: true })),
      ...elements,
    ],
    drawing_image: prop.drawing_image || null,
    total_units_count: prop.total_units_count ?? null,
    booked_units: prop.booked_units ?? null,
    open_units: prop.open_units ?? null,
  };
};

export const saveLayout = async (propertyId, elements) => {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('DELETE FROM plot_layout_elements WHERE property_id=$1', propertyId);
    await tx.$executeRawUnsafe('DELETE FROM plot_units WHERE property_id=$1', propertyId);
    for (const el of elements) {
      const type = el.type?.toUpperCase();
      await tx.$queryRawUnsafe(
        `INSERT INTO plot_layout_elements (property_id, type, name, x, y, width, height, rotation, color, font_size, font_weight, visible)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING element_id`,
        propertyId, el.type || 'text', el.name || null, el.x, el.y, el.width, el.height,
        el.rotation || 0, el.color || null, el.font_size || null, el.font_weight || null, el.visible !== false
      );
      if (type === 'PLOT') {
        await tx.$executeRawUnsafe(
          `INSERT INTO plot_units (property_id, plot_number, status) VALUES ($1, $2, $3)`,
          propertyId, el.name || el.plot_number, el.status || 'Nil Booking'
        );
      }
    }
  });
  return { success: true };
};
