import prisma from '../prisma.js';

const stageToBookingStatus = {
  VISIT_NEGOTIATE:  'on_booking',
  TOKEN_PAYMENT:    'confirmed',
  UNREGISTERED_DOC: 'unregistered',
  REGISTERED_DOC:   'registered',
  SALE_DEED:        'closed',
};

const statusToStageIndex = {
  on_booking:   0,
  confirmed:    1,
  unregistered: 2,
  registered:   3,
  closed:       4,
  // legacy values (backward compat)
  booked:       0,
  token_paid:   1,
  advance_paid: 2,
};

async function upsertEnquiry(prismaClient, propertyId, buyerId, bookingStatus) {
  const existing = await prismaClient.$queryRawUnsafe(
    `SELECT enquiry_id FROM enquiries WHERE property_id=$1 AND buyer_id=$2 LIMIT 1`,
    propertyId, buyerId
  );
  const today = new Date().toISOString().slice(0, 10);
  if (existing.length) {
    await prismaClient.$executeRawUnsafe(
      `UPDATE enquiries SET booking_status=$1, booking_date=$2, contacted=true WHERE enquiry_id=$3`,
      bookingStatus, today, existing[0].enquiry_id
    );
  } else {
    await prismaClient.$executeRawUnsafe(
      `INSERT INTO enquiries (property_id, buyer_id, enquiry_type, booking_status, booking_date, contacted)
       VALUES ($1, $2, 'buyer', $3, $4, true)`,
      propertyId, buyerId, bookingStatus, today
    );
  }
}

export async function getFlowByPhone({ propertyId, unitType, unitId, phone }) {
  let buyerRes = await prisma.$queryRawUnsafe('SELECT buyer_id FROM buyers WHERE phone_number=$1', phone);
  let buyerId;
  if (!buyerRes.length) {
    const nb = await prisma.$queryRawUnsafe('INSERT INTO buyers(phone_number) VALUES ($1) RETURNING buyer_id', phone);
    buyerId = nb[0].buyer_id;
  } else {
    buyerId = buyerRes[0].buyer_id;
  }

  const bookingRes = await prisma.$queryRawUnsafe(
    `SELECT status FROM bookings WHERE property_id=$1 AND unit_type=$2 AND unit_id=$3 AND buyer_id=$4
     ORDER BY booking_id DESC LIMIT 1`,
    propertyId, unitType, unitId, buyerId
  );
  const buyerStatus = bookingRes[0]?.status || null;
  return { buyerId, currentIndex: buyerStatus ? (statusToStageIndex[buyerStatus] ?? -1) : -1, status: buyerStatus };
}

export async function getGeneralFlow({ propertyId, unitType, unitId }) {
  const res = await prisma.$queryRawUnsafe(
    `SELECT status FROM bookings WHERE property_id=$1 AND unit_type=$2 AND unit_id=$3`,
    propertyId, unitType, unitId
  );
  if (!res.length) return { overallStageIndex: -1, overallStatus: null };

  let maxIndex = -1, finalStatus = null;
  res.forEach(row => {
    const index = statusToStageIndex[row.status] ?? -1;
    if (index > maxIndex) { maxIndex = index; finalStatus = row.status; }
  });
  return { overallStageIndex: maxIndex, overallStatus: finalStatus };
}

export async function updateStage({ propertyId, unitType, unitId, phone, stage, tokenPaidTo = null }) {
  let buyerRes = await prisma.$queryRawUnsafe('SELECT buyer_id FROM buyers WHERE phone_number=$1', phone);
  let buyerId;
  if (!buyerRes.length) {
    const nb = await prisma.$queryRawUnsafe('INSERT INTO buyers(phone_number) VALUES ($1) RETURNING buyer_id', phone);
    buyerId = nb[0].buyer_id;
  } else {
    buyerId = buyerRes[0].buyer_id;
  }

  const bookingStatus = stageToBookingStatus[stage];
  if (!bookingStatus) throw new Error('Invalid stage');

  // Prevent double-confirmation
  if (stage === 'TOKEN_PAYMENT') {
    const existing = await prisma.$queryRawUnsafe(
      `SELECT 1 FROM bookings WHERE property_id=$1 AND unit_type=$2 AND unit_id=$3
       AND status IN ('confirmed','unregistered','registered','closed','token_paid','advance_paid') LIMIT 1`,
      propertyId, unitType, unitId
    );
    if (existing.length) {
      const err = new Error('Property already confirmed by another buyer');
      err.statusCode = 409;
      throw err;
    }
  }

  // Set expires_at = 14 days from now for initial on_booking stage only
  const expiresAt = stage === 'VISIT_NEGOTIATE'
    ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    : null;

  await prisma.$executeRawUnsafe(
    `INSERT INTO bookings (property_id, unit_type, unit_id, buyer_id, status, token_paid_to, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    propertyId, unitType, unitId, buyerId, bookingStatus, tokenPaidTo, expiresAt
  );

  // Sync enquiry record (best-effort — skip if columns missing until migration is run)
  try {
    await upsertEnquiry(prisma, propertyId, buyerId, bookingStatus);
  } catch {}

  const today = new Date().toISOString().slice(0, 10);

  if (stage === 'VISIT_NEGOTIATE') {
    if (unitType === 'sale') await prisma.$executeRawUnsafe(`UPDATE sale_properties SET sale_status='ON_BOOKING' WHERE property_id=$1`, propertyId);
    if (unitType === 'rent') await prisma.$executeRawUnsafe(`UPDATE rent_properties SET rent_status='ON_BOOKING' WHERE property_id=$1`, propertyId);
    if (unitType === 'plot') await prisma.$executeRawUnsafe(`UPDATE plot_units SET status='ON_BOOKING' WHERE plot_unit_id=$1`, unitId);
    if (unitType === 'flat') await prisma.$executeRawUnsafe(`UPDATE flat_units SET status='ON_BOOKING' WHERE flat_unit_id=$1`, unitId);
  }

  if (stage === 'TOKEN_PAYMENT') {
    if (unitType === 'sale') await prisma.$executeRawUnsafe(
      `UPDATE sale_properties SET sale_status='CONFIRMED', token_paid_to=$1 WHERE property_id=$2`,
      tokenPaidTo, propertyId
    );
    if (unitType === 'rent') await prisma.$executeRawUnsafe(
      `UPDATE rent_properties SET rent_status='CONFIRMED', token_paid_to=$1 WHERE property_id=$2`,
      tokenPaidTo, propertyId
    );
    if (unitType === 'plot') await prisma.$executeRawUnsafe(
      `UPDATE plot_units SET status='CONFIRMED', assigned_buyer_id=$1, token_paid_to=$2 WHERE plot_unit_id=$3`,
      buyerId, tokenPaidTo, unitId
    );
    if (unitType === 'flat') await prisma.$executeRawUnsafe(
      `UPDATE flat_units SET status='CONFIRMED', assigned_buyer_id=$1, token_paid_to=$2 WHERE flat_unit_id=$3`,
      buyerId, tokenPaidTo, unitId
    );
  }

  if (stage === 'UNREGISTERED_DOC') {
    if (unitType === 'sale') await prisma.$executeRawUnsafe(`UPDATE sale_properties SET sale_status='UNREGISTERED' WHERE property_id=$1`, propertyId);
    if (unitType === 'rent') await prisma.$executeRawUnsafe(`UPDATE rent_properties SET rent_status='UNREGISTERED' WHERE property_id=$1`, propertyId);
    if (unitType === 'plot') await prisma.$executeRawUnsafe(`UPDATE plot_units SET status='UNREGISTERED' WHERE plot_unit_id=$1`, unitId);
    if (unitType === 'flat') await prisma.$executeRawUnsafe(`UPDATE flat_units SET status='UNREGISTERED' WHERE flat_unit_id=$1`, unitId);
  }

  if (stage === 'REGISTERED_DOC') {
    if (unitType === 'sale') await prisma.$executeRawUnsafe(`UPDATE sale_properties SET sale_status='REGISTERED' WHERE property_id=$1`, propertyId);
    if (unitType === 'rent') await prisma.$executeRawUnsafe(`UPDATE rent_properties SET rent_status='REGISTERED' WHERE property_id=$1`, propertyId);
    if (unitType === 'plot') await prisma.$executeRawUnsafe(`UPDATE plot_units SET status='REGISTERED' WHERE plot_unit_id=$1`, unitId);
    if (unitType === 'flat') await prisma.$executeRawUnsafe(`UPDATE flat_units SET status='REGISTERED' WHERE flat_unit_id=$1`, unitId);
  }

  if (stage === 'SALE_DEED') {
    if (unitType === 'sale') await prisma.$executeRawUnsafe(
      `UPDATE sale_properties SET sale_status='SOLD', sold_date=$1 WHERE property_id=$2`,
      today, propertyId
    );
    if (unitType === 'rent') await prisma.$executeRawUnsafe(
      `UPDATE rent_properties SET rent_status='RENTED', rent_out_date=$1 WHERE property_id=$2`,
      today, propertyId
    );
    if (unitType === 'plot') await prisma.$executeRawUnsafe(
      `UPDATE plot_units SET status='SOLD', sold_date=$1 WHERE plot_unit_id=$2`,
      today, unitId
    );
    if (unitType === 'flat') await prisma.$executeRawUnsafe(
      `UPDATE flat_units SET status='SOLD', sold_date=$1 WHERE flat_unit_id=$2`,
      today, unitId
    );
  }
}
