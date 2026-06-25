import prisma from '../prisma.js';
import { uploadToCloudflare, deleteFromCloudflare } from '../uploadToCloudflare';

export async function getAll(type) {
  let values = [];
  let query = `
    SELECT p.property_id, p.formatted_id, p.created_at, p.title, p.description, p.seller_id,
      p.contact_phone, p.address, p.status,
      COALESCE((SELECT COUNT(DISTINCT b.buyer_id)::INT FROM bookings b
        WHERE b.property_id = p.property_id AND b.unit_type = 'rent'), 0) AS booked_people_count,
      p.latitude, p.longitude,
      d.district_id, d.district_name, t.taluk_id, t.taluk_name, v.village_id, v.village_name,
      r.bhk, r.rent_amount, r.advance_amount, r.property_use, r.furnished_status, r.rent_status,
      r.landmark, r.street_name, r.extent_area, r.extent_unit,
      r.alternate_contact_phone,
      r.legal_value, r.area_sales_speed, r.facing, r.road_width,
      r.videos->>'url' AS video_url,
      s.name AS seller_name,
      (SELECT JSON_AGG(JSON_BUILD_OBJECT('url', file_url)) FROM property_assets
       WHERE property_id = p.property_id AND asset_type = 'image') AS images
    FROM properties p
    INNER JOIN rent_properties r ON r.property_id = p.property_id
    LEFT JOIN sellers s ON s.seller_id = p.seller_id
    LEFT JOIN districts d ON p.district_id = d.district_id
    LEFT JOIN taluks t ON p.taluk_id = t.taluk_id
    LEFT JOIN villages v ON p.village_id = v.village_id
    WHERE p.status = 'approved' AND p.property_type = 'rent'
  `;

  if (type) {
    if (['commercial', 'residential', 'other'].includes(type.toLowerCase())) {
      values.push(type.toLowerCase());
      query += ` AND LOWER(r.property_use) = $${values.length}`;
    } else if (type === '3') {
      query += ` AND CAST(r.bhk AS INTEGER) >= 3`;
    } else {
      values.push(type);
      query += ` AND r.bhk = $${values.length}`;
    }
  }

  query += ` ORDER BY p.created_at DESC`;
  const rows = await prisma.$queryRawUnsafe(query, ...values);
  return rows;
}

export async function createRentProperty(data, files = {}) {
  const phone = data.contact_phone;
  let sellerId;

  const result = await prisma.$transaction(async (tx) => {
    const sellerCheck = await tx.$queryRawUnsafe('SELECT seller_id FROM sellers WHERE phone_number = $1 LIMIT 1', phone);
    const existingOwner = sellerCheck.length > 0;
    if (existingOwner) {
        sellerId = sellerCheck[0].seller_id;
    } else {
      const newSeller = await tx.$queryRawUnsafe(
        'INSERT INTO sellers (name, phone_number) VALUES ($1, $2) RETURNING seller_id',
        data.seller_name || '', phone
      );
      sellerId = newSeller[0].seller_id;
    }

    const prop = await tx.$queryRawUnsafe(
      `INSERT INTO properties (property_type, seller_id, contact_phone, address, latitude, longitude, status, live_image)
       VALUES ('rent', $1, $2, $3, $4, $5, 'Draft', $6) RETURNING property_id`,
      sellerId, phone, data.address || null, data.latitude || null, data.longitude || null, null
    );
    const propertyId = prop[0].property_id;

    try {
      await tx.$executeRawUnsafe(
        `INSERT INTO enquiries (property_id, seller_id, enquiry_type, message, booking_status)
         VALUES ($1, $2, 'seller', $3, 'confirmed')`,
        propertyId, sellerId, 'Seller created property listing with basic details'
      );
    } catch (e) {
      if (!(e.meta?.code === '23505' || e.code === 'P2002')) throw e;
    }

    return { propertyId, sellerId, existingOwner };
  });

  const { propertyId, existingOwner } = result;
  if (files.live_image) {
    const upload = await uploadToCloudflare(propertyId, 'live_image', files.live_image);
    await prisma.$executeRawUnsafe('UPDATE properties SET live_image = $1 WHERE property_id = $2', upload.url, propertyId);
  }

  return { property_id: propertyId, seller_id: sellerId, existing_owner: existingOwner };
}

export async function updateRentProperty(propertyId, data, files = {}) {
  const bhkNumber = data.bhk ? parseInt(data.bhk.replace(/\D/g, '')) : null;
  const rentAmount = data.rent_amount !== '' && data.rent_amount != null ? parseFloat(data.rent_amount) : null;
  const advanceAmount = data.advance_amount !== '' && data.advance_amount != null ? parseFloat(data.advance_amount) : null;
  const extentArea = data.extent_area !== '' && data.extent_area != null ? parseFloat(data.extent_area) : null;
  const propertyUse = data.property_use ? data.property_use.toLowerCase() : null;
  const filesToDelete = [];

  const propertyResult = await prisma.$queryRawUnsafe('SELECT seller_id, live_image FROM properties WHERE property_id = $1', propertyId);
  if (!propertyResult.length) throw new Error('Property not found');

  const sellerId = propertyResult[0].seller_id;
  let liveImageUrl = propertyResult[0].live_image;

  if (files.live_image) {
    const upload = await uploadToCloudflare(propertyId, 'live_image', files.live_image);
    if (liveImageUrl) filesToDelete.push(liveImageUrl);
    liveImageUrl = upload.url;
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `UPDATE properties SET district_id=$1, taluk_id=$2, village_id=$3, area_id=$4, title=$5,
       description=$6, contact_phone=$7, address=$8, latitude=$9, longitude=$10,
       premium_requested=$11, status='Pending', live_image=$12 WHERE property_id=$13`,
      data.district_id || null, data.taluk_id || null, data.village_id || null, data.area_id || null,
      data.title || null, data.description || '', data.contact_phone || null, data.address || null,
      data.latitude || null, data.longitude || null, data.premium_requested === true, liveImageUrl, propertyId
    );

    const rentCheck = await tx.$queryRawUnsafe('SELECT 1 FROM rent_properties WHERE property_id = $1', propertyId);
    if (rentCheck.length === 0) {
      await tx.$executeRawUnsafe(
        `INSERT INTO rent_properties (property_id, bhk, rent_amount, advance_amount, property_use, rent_status, landmark, street_name, extent_area, extent_unit, alternate_contact_phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        propertyId, bhkNumber, rentAmount, advanceAmount, propertyUse || null, 'Nil Booking', data.landmark || null, data.street_name || null, extentArea, data.extent_unit || null, data.alternate_contact_phone || null
      );
    } else {
      await tx.$executeRawUnsafe(
        `UPDATE rent_properties SET bhk=$1, rent_amount=$2, advance_amount=$3, property_use=$4,
         rent_status=$5, landmark=$6, street_name=$7, extent_area=$8, extent_unit=$9, alternate_contact_phone=$10 WHERE property_id=$11`,
        bhkNumber, rentAmount, advanceAmount, propertyUse || null, data.rent_status || 'Nil Booking',
        data.landmark || null, data.street_name || null, extentArea, data.extent_unit || null, data.alternate_contact_phone || null, propertyId
      );
    }

    const updateResult = await tx.$queryRawUnsafe(
      `UPDATE enquiries SET message=$1, enquiry_date=CURRENT_TIMESTAMP
       WHERE property_id=$2 AND seller_id=$3 AND enquiry_type='seller' RETURNING enquiry_id`,
      `Property details updated: ${data.title || 'Untitled'}`, propertyId, sellerId
    );
    if (!updateResult.length) {
      try {
        await tx.$executeRawUnsafe(
          `INSERT INTO enquiries (property_id, seller_id, enquiry_type, message, booking_status)
           VALUES ($1, $2, 'seller', $3, 'confirmed')`,
          propertyId, sellerId, `Property details updated: ${data.title || 'Untitled'}`
        );
      } catch (e) {
        if (!(e.meta?.code === '23505' || e.code === 'P2002')) throw e;
      }
    }
  });

  await Promise.all(filesToDelete.map(deleteFromCloudflare));
  return { message: 'Property updated successfully', property_id: propertyId };
}
