import prisma from '../prisma.js';

const stageToBookingStatus = {
  VISIT_NEGOTIATE: 'booked',
  TOKEN_PAYMENT: 'token_paid',
  UNREGISTERED_DOC: 'advance_paid',
  SALE_DEED: 'closed',
};

const statusToStageIndex = { booked: 0, token_paid: 1, advance_paid: 2, closed: 3 };

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

export async function updateStage({ propertyId, unitType, unitId, phone, stage }) {
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

  if (stage === 'TOKEN_PAYMENT') {
    const existing = await prisma.$queryRawUnsafe(
      `SELECT 1 FROM bookings WHERE property_id=$1 AND unit_type=$2 AND unit_id=$3
       AND status IN ('token_paid','advance_paid','closed') LIMIT 1`,
      propertyId, unitType, unitId
    );
    if (existing.length) {
      const err = new Error('Property already confirmed by another buyer');
      err.statusCode = 409;
      throw err;
    }
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO bookings (property_id, unit_type, unit_id, buyer_id, status) VALUES ($1,$2,$3,$4,$5)`,
    propertyId, unitType, unitId, buyerId, bookingStatus
  );

  if (stage === 'VISIT_NEGOTIATE') {
    if (unitType === 'sale') await prisma.$executeRawUnsafe(`UPDATE sale_properties SET sale_status='ON_BOOKING' WHERE property_id=$1`, propertyId);
    if (unitType === 'rent') await prisma.$executeRawUnsafe(`UPDATE rent_properties SET rent_status='ON_BOOKING' WHERE property_id=$1`, propertyId);
    if (unitType === 'plot') await prisma.$executeRawUnsafe(`UPDATE plot_units SET status='ON_BOOKING' WHERE plot_unit_id=$1`, unitId);
    if (unitType === 'flat') await prisma.$executeRawUnsafe(`UPDATE flat_units SET status='ON_BOOKING' WHERE flat_unit_id=$1`, unitId);
  }
  if (stage === 'TOKEN_PAYMENT') {
    if (unitType === 'sale') await prisma.$executeRawUnsafe(`UPDATE sale_properties SET sale_status='BOOKED' WHERE property_id=$1`, propertyId);
    if (unitType === 'rent') await prisma.$executeRawUnsafe(`UPDATE rent_properties SET rent_status='BOOKED' WHERE property_id=$1`, propertyId);
    if (unitType === 'plot') await prisma.$executeRawUnsafe(`UPDATE plot_units SET status='BOOKED', assigned_buyer_id=$1 WHERE plot_unit_id=$2`, buyerId, unitId);
    if (unitType === 'flat') await prisma.$executeRawUnsafe(`UPDATE flat_units SET status='BOOKED', assigned_buyer_id=$1 WHERE flat_unit_id=$2`, buyerId, unitId);
  }
  if (stage === 'SALE_DEED') {
    if (unitType === 'sale') await prisma.$executeRawUnsafe(`UPDATE sale_properties SET sale_status='SOLD' WHERE property_id=$1`, propertyId);
    if (unitType === 'rent') await prisma.$executeRawUnsafe(`UPDATE rent_properties SET rent_status='RENTED' WHERE property_id=$1`, propertyId);
    if (unitType === 'plot') await prisma.$executeRawUnsafe(`UPDATE plot_units SET status='SOLD' WHERE plot_unit_id=$1`, unitId);
    if (unitType === 'flat') await prisma.$executeRawUnsafe(`UPDATE flat_units SET status='SOLD' WHERE flat_unit_id=$1`, unitId);
  }
}
