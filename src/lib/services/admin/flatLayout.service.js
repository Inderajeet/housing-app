import prisma from '../../prisma.js';

export const getLayout = async (propertyId) => {
  const flats = await prisma.$queryRawUnsafe(`
    SELECT flat_unit_id, flat_number, status, assigned_buyer_id,
      COALESCE((SELECT COUNT(DISTINCT b.buyer_id)::INT FROM bookings b WHERE b.unit_type = 'flat' AND b.unit_id = flat_units.flat_unit_id), 0) AS booked_people_count
    FROM flat_units WHERE property_id = $1 ORDER BY flat_number
  `, propertyId);
  const elements = await prisma.$queryRawUnsafe(`
    SELECT element_id, type, name, x, y, width, height, rotation, color, font_size, font_weight, visible
    FROM flat_layout_elements WHERE property_id = $1
  `, propertyId);
  return [
    ...flats.map(f => ({ ...f, type: 'FLAT', visible: true })),
    ...elements,
  ];
};

export const saveLayout = async (propertyId, elements) => {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('DELETE FROM flat_layout_elements WHERE property_id=$1', propertyId);
    await tx.$executeRawUnsafe('DELETE FROM flat_units WHERE property_id=$1', propertyId);
    for (const el of elements) {
      const type = el.type?.toUpperCase();
      await tx.$executeRawUnsafe(
        `INSERT INTO flat_layout_elements (property_id, type, name, x, y, width, height, rotation, color, font_size, font_weight, visible)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        propertyId, el.type || 'text', el.name || null, el.x, el.y, el.width, el.height,
        el.rotation || 0, el.color || null, el.font_size || null, el.font_weight || null, el.visible !== false
      );
      if (type === 'FLAT') {
        await tx.$executeRawUnsafe(
          `INSERT INTO flat_units (property_id, flat_number, status) VALUES ($1, $2, $3)`,
          propertyId, el.name || el.flat_number, el.status || 'Nil Booking'
        );
      }
    }
  });
  return { success: true };
};
