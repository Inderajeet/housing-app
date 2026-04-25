import prisma from '../../prisma.js';
import { uploadToCloudflare, deleteFromCloudflare } from '../../uploadToCloudflare.js';

const toInt = (v) => (v === '' || v === undefined || v === null ? null : parseInt(v, 10));
const toFloat = (v) => (v === '' || v === undefined || v === null ? null : parseFloat(v));
const toStr = (v) => (v === '' || v === undefined ? null : v);

export const getAll = async () => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT p.property_id, p.formatted_id, p.created_at, p.title,
      COALESCE(r.description, p.description) AS description,
      p.seller_id, p.contact_phone, p.address, p.status,
      COALESCE((SELECT COUNT(DISTINCT b.buyer_id)::INT FROM bookings b
        WHERE b.property_id = p.property_id AND b.unit_type = 'rent'), 0) AS booked_people_count,
      p.live_image, p.latitude, p.longitude, p.district_id, p.taluk_id, p.village_id, p.area_id,
      r.bhk, r.rent_amount, r.advance_amount, r.property_use, r.furnished_status, r.rent_status,
      r.landmark, r.street_name, r.extent_area, r.extent_unit,
      r.alternate_contact_phone, r.alternate_seller_name,
      s.name as seller_name, s.phone_number as seller_phone
    FROM properties p
    JOIN rent_properties r ON r.property_id = p.property_id
    LEFT JOIN sellers s ON s.seller_id = p.seller_id
    ORDER BY p.created_at DESC
  `);
  return rows;
};

export const getById = async (propertyId) => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT p.property_id, p.formatted_id, p.created_at, p.title,
      COALESCE(r.description, p.description) AS description,
      p.seller_id, p.contact_phone, p.address, p.status,
      COALESCE((SELECT COUNT(DISTINCT b.buyer_id)::INT FROM bookings b
        WHERE b.property_id = p.property_id AND b.unit_type = 'rent'), 0) AS booked_people_count,
      p.live_image, p.latitude, p.longitude, p.district_id, p.taluk_id, p.village_id, p.area_id,
      r.bhk, r.rent_amount, r.advance_amount, r.property_use, r.furnished_status, r.rent_status,
      r.landmark, r.street_name, r.extent_area, r.extent_unit,
      r.alternate_contact_phone, r.alternate_seller_name,
      s.name as seller_name, s.phone_number as seller_phone
    FROM properties p
    JOIN rent_properties r ON r.property_id = p.property_id
    LEFT JOIN sellers s ON s.seller_id = p.seller_id
    WHERE p.property_id = $1
  `, propertyId);
  return rows[0] || null;
};

export const createRentProperty = async (data, files = {}) => {
  const extentArea = data.extent_area && data.extent_area !== '' ? parseFloat(data.extent_area) : null;
  let sellerId = data.seller_id;
  const phone = data.contact_phone;
  const sellerName = data.seller_name || '';

  const result = await prisma.$transaction(async (tx) => {
    if (phone) {
      const sellerCheck = await tx.$queryRawUnsafe('SELECT seller_id, name FROM sellers WHERE phone_number = $1 LIMIT 1', phone);
      if (sellerCheck.length > 0) {
        sellerId = sellerCheck[0].seller_id;
        if (sellerName && sellerName !== sellerCheck[0].name) {
          await tx.$executeRawUnsafe('UPDATE sellers SET name = $1 WHERE seller_id = $2', sellerName, sellerId);
        }
      } else {
        const newSeller = await tx.$queryRawUnsafe('INSERT INTO sellers (name, phone_number) VALUES ($1, $2) RETURNING seller_id', sellerName, phone);
        sellerId = newSeller[0].seller_id;
      }
    }
    const prop = await tx.$queryRawUnsafe(
      `INSERT INTO properties (property_type, seller_id, title, description, contact_phone, address, latitude, longitude, district_id, taluk_id, village_id, area_id, status, live_image)
       VALUES ('rent', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING property_id`,
      toInt(sellerId), toStr(data.title), toStr(data.description), toStr(phone), toStr(data.address),
      toFloat(data.latitude), toFloat(data.longitude), toInt(data.district_id), toInt(data.taluk_id),
      toInt(data.village_id), toInt(data.area_id), toStr(data.status || 'Pending'), null
    );
    const propertyId = prop[0].property_id;
    await tx.$executeRawUnsafe(
      `INSERT INTO rent_properties (property_id, bhk, rent_amount, advance_amount, property_use, furnished_status, rent_status, landmark, street_name, extent_area, extent_unit, alternate_contact_phone, alternate_seller_name, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      propertyId, toInt(data.bhk), toInt(data.rent_amount) || 0, toInt(data.advance_amount) || 0,
      toStr(data.property_use), toStr(data.furnished_status), toStr(data.rent_status),
      toStr(data.landmark), toStr(data.street_name), extentArea, toStr(data.extent_unit),
      toStr(data.alternate_contact_phone), toStr(data.alternate_seller_name), toStr(data.description)
    );
    return { propertyId, sellerId };
  });

  const { propertyId } = result;
  if (files.live_image) {
    const upload = await uploadToCloudflare(propertyId, 'live_image', files.live_image);
    await prisma.$executeRawUnsafe('UPDATE properties SET live_image = $1 WHERE property_id = $2', upload.url, propertyId);
  }

  return { property_id: propertyId, seller_id: sellerId, seller_name: sellerName };
};

export const updateRentProperty = async (propertyId, data, files = {}) => {
  const extentArea = data.extent_area && data.extent_area !== '' ? parseFloat(data.extent_area) : null;
  const filesToDelete = [];

  const currentProp = await prisma.$queryRawUnsafe('SELECT seller_id, live_image FROM properties WHERE property_id = $1', propertyId);
  if (!currentProp.length) throw new Error('Property not found');
  const currentSellerId = currentProp[0].seller_id;

  let liveImageUrl = currentProp[0].live_image;
  if (files.live_image) {
    const upload = await uploadToCloudflare(propertyId, 'live_image', files.live_image);
    liveImageUrl = upload.url;
    if (currentProp[0].live_image) filesToDelete.push(currentProp[0].live_image);
  }

  const phone = data.contact_phone;
  const sellerName = data.seller_name || '';

  await prisma.$transaction(async (tx) => {
    if (phone) {
      const sellerCheck = await tx.$queryRawUnsafe('SELECT seller_id FROM sellers WHERE seller_id = $1', currentSellerId);
      if (sellerCheck.length > 0) {
        await tx.$executeRawUnsafe('UPDATE sellers SET name = $1, phone_number = $2 WHERE seller_id = $3', sellerName, phone, currentSellerId);
      } else {
        const newSeller = await tx.$queryRawUnsafe('INSERT INTO sellers (name, phone_number) VALUES ($1, $2) RETURNING seller_id', sellerName, phone);
        await tx.$executeRawUnsafe('UPDATE properties SET seller_id = $1 WHERE property_id = $2', newSeller[0].seller_id, propertyId);
      }
    }
    await tx.$executeRawUnsafe(
      `UPDATE properties SET title=$1, description=$2, contact_phone=$3, address=$4, district_id=$5, taluk_id=$6, village_id=$7, area_id=$8, status=$9, latitude=$10, longitude=$11, live_image=$12 WHERE property_id=$13`,
      toStr(data.title), toStr(data.description), toStr(phone), toStr(data.address),
      toInt(data.district_id), toInt(data.taluk_id), toInt(data.village_id), toInt(data.area_id),
      toStr(data.status), toFloat(data.latitude), toFloat(data.longitude), liveImageUrl, propertyId
    );
    await tx.$executeRawUnsafe(
      `UPDATE rent_properties SET bhk=$1, rent_amount=$2, advance_amount=$3, property_use=$4, furnished_status=$5, rent_status=$6, landmark=$7, street_name=$8, extent_area=$9, extent_unit=$10, alternate_contact_phone=$11, alternate_seller_name=$12, description=$13 WHERE property_id=$14`,
      toInt(data.bhk), toInt(data.rent_amount) || 0, toInt(data.advance_amount) || 0,
      toStr(data.property_use), toStr(data.furnished_status), toStr(data.rent_status),
      toStr(data.landmark), toStr(data.street_name), extentArea, toStr(data.extent_unit),
      toStr(data.alternate_contact_phone), toStr(data.alternate_seller_name), toStr(data.description), propertyId
    );
  });

  await Promise.all(filesToDelete.map(deleteFromCloudflare));
  return { property_id: propertyId, seller_name: sellerName };
};

export const deleteRentProperty = async (propertyId) => {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('DELETE FROM rent_properties WHERE property_id = $1', propertyId);
    await tx.$executeRawUnsafe('DELETE FROM property_assets WHERE property_id = $1', propertyId);
    await tx.$executeRawUnsafe('DELETE FROM properties WHERE property_id = $1', propertyId);
  });
};

export const updateRentStatus = async (propertyId, status) => {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE properties SET status = $1, updated_at = NOW() WHERE property_id = $2 AND property_type = 'rent' RETURNING property_id, status`,
    status, propertyId
  );
  if (!rows.length) throw new Error('Property not found');
  return rows[0];
};
