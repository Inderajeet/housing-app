import prisma from '../prisma.js';

export async function getLayout(propertyId) {
  const plots = await prisma.$queryRawUnsafe(
    `SELECT plot_unit_id, plot_number, status, assigned_buyer_id,
      COALESCE((SELECT COUNT(DISTINCT b.buyer_id)::INT FROM bookings b
        WHERE b.unit_type = 'plot' AND b.unit_id = plot_units.plot_unit_id), 0) AS booked_people_count
     FROM plot_units WHERE property_id = $1 ORDER BY plot_number`,
    propertyId
  );
  const elements = await prisma.$queryRawUnsafe(
    `SELECT element_id, type, name, x, y, width, height, rotation, color, font_size, font_weight, visible, points, closed
     FROM plot_layout_elements WHERE property_id = $1`,
    propertyId
  );
  return [
    ...plots.map(p => ({ ...p, type: 'plot', visible: true })),
    ...elements,
  ];
}
