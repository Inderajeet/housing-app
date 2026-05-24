import prisma from '../prisma.js';
import { uploadToCloudflare, deleteFromCloudflare } from '../uploadToCloudflare';

const toInt = (v) => (v === '' || v == null ? null : parseInt(v, 10));
const toFloat = (v) => (v === '' || v == null ? null : parseFloat(v));
const toStr = (v) => (v === '' || v == null ? null : v);

export async function getAll(type) {
  let query = `
    SELECT p.property_id, p.formatted_id, p.created_at, p.title, p.description, p.seller_id,
      p.contact_phone, p.address, p.status,
      COALESCE((SELECT COUNT(DISTINCT b.buyer_id)::INT FROM bookings b
        WHERE b.property_id = p.property_id AND b.unit_type IN ('sale', 'plot', 'flat')), 0) AS booked_people_count,
      p.latitude, p.longitude,
      p.area_speed, p.amenities_rating, p.utilities_rating, p.legal_rating,
      d.district_id, d.district_name, t.taluk_id, t.taluk_name, v.village_id, v.village_name,
      s.sale_type, s.price AS sale_price, s.rate_unit, s.area_size, s.extension,
      s.street_name_or_road_name, s.layout_name,
      s.survey_number, s.boundary_north, s.boundary_south, s.boundary_east, s.boundary_west,
      s.sale_status, s.legal_value, s.area_sales_speed, s.facing, s.road_width,
      CASE WHEN LOWER(COALESCE(s.sale_type, '')) IN ('plot', 'flat') THEN s.drawing_image ELSE NULL END AS drawing_image,
      s.total_units_count, s.booked_units, s.open_units,
      sel.name AS seller_name,
      (SELECT JSON_AGG(JSON_BUILD_OBJECT('url', file_url)) FROM property_assets
       WHERE property_id = p.property_id AND asset_type = 'image') AS images
    FROM properties p
    INNER JOIN sale_properties s ON s.property_id = p.property_id
    LEFT JOIN sellers sel ON sel.seller_id = p.seller_id
    LEFT JOIN districts d ON d.district_id = p.district_id
    LEFT JOIN taluks t ON t.taluk_id = p.taluk_id
    LEFT JOIN villages v ON v.village_id = p.village_id
    WHERE p.status = 'approved' AND p.property_type = 'sale'
  `;
  const values = [];
  if (type) { values.push(type.toLowerCase()); query += ` AND s.sale_type = $${values.length}`; }
  query += ` ORDER BY p.formatted_id ASC NULLS LAST`;
  const rows = await prisma.$queryRawUnsafe(query, ...values);
  return rows;
}

export async function create(data, files = {}) {
  const phone = data.contact_phone;
  let sellerId;

  const result = await prisma.$transaction(async (tx) => {
    const sellerCheck = await tx.$queryRawUnsafe('SELECT seller_id FROM sellers WHERE phone_number = $1 LIMIT 1', phone);
    if (sellerCheck.length > 0) {
      sellerId = sellerCheck[0].seller_id;
    } else {
      const newSeller = await tx.$queryRawUnsafe(
        'INSERT INTO sellers (name, phone_number) VALUES ($1, $2) RETURNING seller_id',
        data.seller_name || '', phone
      );
      sellerId = newSeller[0].seller_id;
    }

    const propRes = await tx.$queryRawUnsafe(
      `INSERT INTO properties (property_type, seller_id, contact_phone, address, latitude, longitude, status, live_image)
       VALUES ('sale', $1, $2, $3, $4, $5, 'Draft', $6) RETURNING property_id`,
      sellerId, phone, data.address || null, data.latitude || null, data.longitude || null, null
    );
    const propertyId = propRes[0].property_id;
    const saleType = toStr(data.sale_type)?.toLowerCase();

    await tx.$executeRawUnsafe(
      `INSERT INTO sale_properties (property_id, sale_type, boundary_north, boundary_south, boundary_east, boundary_west, drawing_image)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      propertyId, data.sale_type || null, data.boundary_north || null, data.boundary_south || null,
      data.boundary_east || null, data.boundary_west || null, null
    );

    try {
      await tx.$executeRawUnsafe(
        `INSERT INTO enquiries (property_id, seller_id, enquiry_type, message, booking_status)
         VALUES ($1, $2, 'seller', $3, 'confirmed')`,
        propertyId, sellerId, 'Seller created property listing with basic details'
      );
    } catch (e) {
      if (!(e.meta?.code === '23505' || e.code === 'P2002')) throw e;
    }

    return { propertyId, sellerId, saleType };
  });

  const { propertyId, saleType } = result;
  const shouldStoreDrawing = saleType === 'plot' || saleType === 'flat';

  if (files.live_image) {
    const upload = await uploadToCloudflare(propertyId, 'live_image', files.live_image);
    await prisma.$executeRawUnsafe('UPDATE properties SET live_image = $1 WHERE property_id = $2', upload.url, propertyId);
  }
  if (files.drawing_image && shouldStoreDrawing) {
    const upload = await uploadToCloudflare(propertyId, 'drawing_image', files.drawing_image);
    await prisma.$executeRawUnsafe('UPDATE sale_properties SET drawing_image = $1 WHERE property_id = $2', upload.url, propertyId);
  }

  return { property_id: propertyId, seller_id: sellerId };
}

export async function update(propertyId, data, files = {}) {
  const price = data.price !== '' && data.price != null ? parseFloat(data.price) : null;
  const filesToDelete = [];

  const propertyResult = await prisma.$queryRawUnsafe(
    `SELECT p.seller_id, p.live_image, s.drawing_image, s.sale_type
     FROM properties p LEFT JOIN sale_properties s ON s.property_id = p.property_id
     WHERE p.property_id = $1`,
    propertyId
  );
  if (!propertyResult.length) throw new Error('Property not found');

  const { seller_id: sellerId, live_image: currentLiveImage, drawing_image: currentDrawingImage } = propertyResult[0];
  const saleType = toStr(data.sale_type ?? propertyResult[0].sale_type)?.toLowerCase();
  const shouldStoreDrawing = saleType === 'plot' || saleType === 'flat';

  let liveImageUrl = currentLiveImage;
  if (files.live_image) {
    const upload = await uploadToCloudflare(propertyId, 'live_image', files.live_image);
    if (liveImageUrl) filesToDelete.push(liveImageUrl);
    liveImageUrl = upload.url;
  }

  let drawingImageUrl = shouldStoreDrawing ? currentDrawingImage : null;
  if (files.drawing_image && shouldStoreDrawing) {
    const upload = await uploadToCloudflare(propertyId, 'drawing_image', files.drawing_image);
    if (currentDrawingImage) filesToDelete.push(currentDrawingImage);
    drawingImageUrl = upload.url;
  }
  if (!shouldStoreDrawing && currentDrawingImage) filesToDelete.push(currentDrawingImage);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `UPDATE properties SET district_id=$1, taluk_id=$2, village_id=$3, area_id=$4, title=$5,
       description=$6, contact_phone=$7, address=$8, latitude=$9, longitude=$10,
       status='Pending', live_image=$11 WHERE property_id=$12`,
      data.district_id || null, data.taluk_id || null, data.village_id || null, data.area_id || null,
      data.title || null, data.description || '', data.contact_phone || null, data.address || null,
      data.latitude || null, data.longitude || null, liveImageUrl, propertyId
    );

    const saleCheck = await tx.$queryRawUnsafe('SELECT 1 FROM sale_properties WHERE property_id = $1', propertyId);
    if (saleCheck.length === 0) {
      await tx.$executeRawUnsafe(
        `INSERT INTO sale_properties (property_id, sale_type, price, area_size, street_name_or_road_name,
         survey_number, boundary_north, boundary_south, boundary_east, boundary_west, sale_status,
         drawing_image, total_units_count, booked_units, open_units)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        propertyId, data.sale_type || null, price, data.area_size || null, data.street_name_or_road_name || null,
        data.survey_number || null, data.boundary_north || null, data.boundary_south || null,
        data.boundary_east || null, data.boundary_west || null, data.sale_status || 'Nil Booking',
        drawingImageUrl, toInt(data.total_units_count) || 0, toStr(data.booked_units) || 0, toStr(data.open_units) || 0
      );
    } else {
      await tx.$executeRawUnsafe(
        `UPDATE sale_properties SET sale_type=$1, price=$2, area_size=$3, street_name_or_road_name=$4,
         survey_number=$5, boundary_north=$6, boundary_south=$7, boundary_east=$8, boundary_west=$9,
         sale_status=$10, total_units_count=$11, booked_units=$12, open_units=$13, drawing_image=$14
         WHERE property_id=$15`,
        data.sale_type || null, price, data.area_size || null, data.street_name_or_road_name || null,
        data.survey_number || null, data.boundary_north || null, data.boundary_south || null,
        data.boundary_east || null, data.boundary_west || null, data.sale_status || 'Nil Booking',
        toInt(data.total_units_count) || 0, toStr(data.booked_units) || 0, toStr(data.open_units) || 0,
        drawingImageUrl, propertyId
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
