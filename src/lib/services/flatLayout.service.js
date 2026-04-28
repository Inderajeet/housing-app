import prisma from '../prisma.js';

export async function getLayout(propertyId) {
  const flats = await prisma.$queryRawUnsafe(
    `SELECT flat_unit_id, flat_number, status, assigned_buyer_id,
      COALESCE((SELECT COUNT(DISTINCT b.buyer_id)::INT FROM bookings b
        WHERE b.unit_type = 'flat' AND b.unit_id = flat_units.flat_unit_id), 0) AS booked_people_count
     FROM flat_units WHERE property_id = $1 ORDER BY flat_number`,
    propertyId
  );
  const elements = await prisma.$queryRawUnsafe(
    `SELECT element_id, type, name, x, y, width, height, rotation, color, font_size, font_weight, visible, points, closed
     FROM flat_layout_elements WHERE property_id = $1`,
    propertyId
  );
  return [
    ...flats.map(f => ({ ...f, type: 'flat', visible: true })),
    ...elements,
  ];
}
