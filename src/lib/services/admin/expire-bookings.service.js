import prisma from '../../prisma.js';

/**
 * Runs once daily via cron.
 * 1. Finds all on_booking bookings whose expires_at has passed.
 * 2. Marks them as 'expired'.
 * 3. For each expired unit — if no active (non-expired, non-cancelled) booking
 *    still exists for that unit — resets the unit and/or property to 'Nil Booking'.
 * 4. For plot/flat: if all units of a parent property are Nil Booking, the
 *    parent sale_properties record is also reset to 'Nil Booking'.
 */
export async function expireOverdueBookings() {
  const now = new Date();

  // 1. Collect all bookings that are on_booking and past their expiry
  const overdueRows = await prisma.$queryRawUnsafe(`
    SELECT booking_id, property_id, unit_type, unit_id
    FROM bookings
    WHERE expires_at <= $1
      AND status IN ('on_booking', 'booked')
  `, now);

  if (!overdueRows.length) return { expired: 0, reset: [] };

  const bookingIds = overdueRows.map(r => Number(r.booking_id));

  // 2. Mark them expired in one shot
  await prisma.$executeRawUnsafe(`
    UPDATE bookings SET status = 'expired'
    WHERE booking_id = ANY($1::int[])
  `, bookingIds);

  const resetItems = [];

  // 3. For each expired booking check whether the unit still has any live booking
  const processed = new Set(); // avoid duplicate work for same unit

  for (const row of overdueRows) {
    const { property_id, unit_type, unit_id } = row;
    const key = `${property_id}:${unit_type}:${unit_id ?? 'null'}`;
    if (processed.has(key)) continue;
    processed.add(key);

    // Any active booking still referencing this unit?
    const stillActive = await prisma.$queryRawUnsafe(`
      SELECT 1 FROM bookings
      WHERE property_id = $1
        AND unit_type   = $2
        AND (
          ($3::int IS NULL AND unit_id IS NULL)
          OR unit_id = $3
        )
        AND status NOT IN ('expired', 'cancelled')
      LIMIT 1
    `, Number(property_id), unit_type, unit_id != null ? Number(unit_id) : null);

    if (stillActive.length > 0) continue; // another buyer still active — leave unit alone

    // Reset unit / property to Nil Booking
    if (unit_type === 'sale') {
      await prisma.$executeRawUnsafe(
        `UPDATE sale_properties SET sale_status = 'Nil Booking' WHERE property_id = $1`,
        Number(property_id)
      );
      resetItems.push({ type: 'sale', property_id: Number(property_id) });
    }

    if (unit_type === 'rent') {
      await prisma.$executeRawUnsafe(
        `UPDATE rent_properties SET rent_status = 'Nil Booking' WHERE property_id = $1`,
        Number(property_id)
      );
      resetItems.push({ type: 'rent', property_id: Number(property_id) });
    }

    if (unit_type === 'plot' && unit_id != null) {
      await prisma.$executeRawUnsafe(
        `UPDATE plot_units SET status = 'Nil Booking' WHERE plot_unit_id = $1`,
        Number(unit_id)
      );
      resetItems.push({ type: 'plot_unit', unit_id: Number(unit_id), property_id: Number(property_id) });

      // If ALL plot units for this property are Nil Booking → reset parent property too
      const nonNil = await prisma.$queryRawUnsafe(`
        SELECT 1 FROM plot_units
        WHERE property_id = $1 AND status != 'Nil Booking'
        LIMIT 1
      `, Number(property_id));

      if (!nonNil.length) {
        await prisma.$executeRawUnsafe(
          `UPDATE sale_properties SET sale_status = 'Nil Booking' WHERE property_id = $1`,
          Number(property_id)
        );
        resetItems.push({ type: 'plot_property', property_id: Number(property_id) });
      }
    }

    if (unit_type === 'flat' && unit_id != null) {
      await prisma.$executeRawUnsafe(
        `UPDATE flat_units SET status = 'Nil Booking' WHERE flat_unit_id = $1`,
        Number(unit_id)
      );
      resetItems.push({ type: 'flat_unit', unit_id: Number(unit_id), property_id: Number(property_id) });

      // If ALL flat units for this property are Nil Booking → reset parent property too
      const nonNil = await prisma.$queryRawUnsafe(`
        SELECT 1 FROM flat_units
        WHERE property_id = $1 AND status != 'Nil Booking'
        LIMIT 1
      `, Number(property_id));

      if (!nonNil.length) {
        await prisma.$executeRawUnsafe(
          `UPDATE sale_properties SET sale_status = 'Nil Booking' WHERE property_id = $1`,
          Number(property_id)
        );
        resetItems.push({ type: 'flat_property', property_id: Number(property_id) });
      }
    }
  }

  return { expired: bookingIds.length, reset: resetItems };
}
