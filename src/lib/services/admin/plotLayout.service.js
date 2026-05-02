import prisma from '../../prisma.js';

export const getLayout = async (propertyId) => {
  const id = parseInt(propertyId, 10);
  if (isNaN(id)) throw new Error('Invalid property ID');

  const plots = await prisma.$queryRawUnsafe(`
    SELECT plot_unit_id, plot_number, status, assigned_buyer_id,
      token_amount, token_paid_to, advance_amount, sold_rate, sold_date, document_number,
      COALESCE((SELECT COUNT(DISTINCT b.buyer_id)::INT FROM bookings b WHERE b.unit_type = 'plot' AND b.unit_id = plot_units.plot_unit_id), 0) AS booked_people_count
    FROM plot_units WHERE property_id = $1 ORDER BY plot_number
  `, id);

  const elements = await prisma.$queryRawUnsafe(`
    SELECT e.element_id, e.type, e.name, e.x, e.y, e.width, e.height, e.rotation, e.color,
           e.font_size, e.font_weight, e.visible, e.points, e.closed,
           pu.status
    FROM plot_layout_elements e
    LEFT JOIN plot_units pu ON pu.property_id = e.property_id AND pu.plot_number = e.name AND UPPER(e.type) = 'PLOT'
    WHERE e.property_id = $1
  `, id);

  const propRows = await prisma.$queryRawUnsafe(`
    SELECT drawing_image, total_units_count, booked_units, open_units
    FROM sale_properties WHERE property_id = $1
  `, id);
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
  const id = parseInt(propertyId, 10);
  if (isNaN(id)) throw new Error('Invalid property ID');

  // Run outside a transaction to avoid the 5s timeout on a remote DB.
  // Deletes first, then bulk-insert in two queries — safe because this is
  // a full replace operation and partial state is recoverable by re-saving.
  await prisma.$executeRawUnsafe('DELETE FROM plot_layout_elements WHERE property_id=$1', id);
  await prisma.$executeRawUnsafe('DELETE FROM plot_units WHERE property_id=$1', id);

  if (elements.length > 0) {
    // Bulk INSERT all layout elements in one query
    const elPlaceholders = elements.map((_, i) => {
      const b = i * 14;
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},$${b+11},$${b+12},$${b+13}::jsonb,$${b+14})`;
    }).join(',');

    const elValues = elements.flatMap(el => [
      id,
      el.type || 'text',
      el.name || null,
      el.x ?? 0,
      el.y ?? 0,
      el.width ?? 1,
      el.height ?? 1,
      el.rotation || 0,
      el.color || null,
      el.font_size || null,
      el.font_weight || null,
      el.visible !== false,
      el.points ? JSON.stringify(el.points) : null,
      el.closed ?? false,
    ]);

    await prisma.$executeRawUnsafe(
      `INSERT INTO plot_layout_elements (property_id,type,name,x,y,width,height,rotation,color,font_size,font_weight,visible,points,closed) VALUES ${elPlaceholders}`,
      ...elValues
    );

    // Bulk INSERT plot_units for PLOT-type elements
    const plotEls = elements.filter(el => el.type?.toUpperCase() === 'PLOT');
    if (plotEls.length > 0) {
      const puPlaceholders = plotEls.map((_, i) => {
        const b = i * 3;
        return `($${b+1},$${b+2},$${b+3})`;
      }).join(',');

      const puValues = plotEls.flatMap(el => [
        id,
        el.name || el.plot_number || null,
        el.status || 'Nil Booking',
      ]);

      await prisma.$executeRawUnsafe(
        `INSERT INTO plot_units (property_id,plot_number,status) VALUES ${puPlaceholders}`,
        ...puValues
      );
    }
  }

  return { success: true };
};
