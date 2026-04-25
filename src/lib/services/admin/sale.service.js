import prisma from '../../prisma.js';
import { uploadToCloudflare, deleteFromCloudflare } from '../../uploadToCloudflare.js';

const toInt = (v) => (v === '' || v === undefined || v === null ? null : parseInt(v, 10));
const toFloat = (v) => (v === '' || v === undefined || v === null ? null : parseFloat(v));
const toStr = (v) => (v === '' || v === undefined ? null : v);

export const getAll = async () => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT p.property_id, p.formatted_id, p.created_at, p.title, p.description,
      p.seller_id, p.contact_phone, p.address, p.status,
      COALESCE((SELECT COUNT(DISTINCT b.buyer_id)::INT FROM bookings b WHERE b.property_id = p.property_id AND b.unit_type = 'sale'), 0) AS booked_people_count,
      p.live_image, p.latitude, p.longitude, p.district_id, p.taluk_id, p.village_id, p.area_id,
      s.sale_type, s.price, s.area_size, s.street_name_or_road_name, s.survey_number,
      s.boundary_north, s.boundary_south, s.boundary_east, s.boundary_west, s.sale_status,
      s.drawing_image, s.total_units_count, s.booked_units, s.open_units,
      s.alternate_contact_phone, s.alternate_seller_name, s.layout_name, s.dtcp,
      s.parent_document, s.sub_registrar_office, s.gift_deed,
      seller.name AS seller_name, seller.phone_number AS seller_phone
    FROM properties p
    INNER JOIN sale_properties s ON s.property_id = p.property_id
    LEFT JOIN sellers seller ON seller.seller_id = p.seller_id
    WHERE p.property_type = 'sale'
    ORDER BY p.created_at DESC
  `);
  return rows;
};

export const getById = async (propertyId) => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT p.property_id, p.formatted_id, p.created_at, p.title, p.description,
      p.seller_id, p.contact_phone, p.address, p.status,
      COALESCE((SELECT COUNT(DISTINCT b.buyer_id)::INT FROM bookings b WHERE b.property_id = p.property_id AND b.unit_type = 'sale'), 0) AS booked_people_count,
      p.live_image, p.latitude, p.longitude, p.district_id, p.taluk_id, p.village_id, p.area_id,
      s.sale_type, s.price, s.area_size, s.street_name_or_road_name, s.survey_number,
      s.boundary_north, s.boundary_south, s.boundary_east, s.boundary_west, s.sale_status,
      s.drawing_image, s.total_units_count, s.booked_units, s.open_units,
      s.alternate_contact_phone, s.alternate_seller_name, s.layout_name, s.dtcp,
      s.parent_document, s.sub_registrar_office, s.gift_deed,
      seller.name AS seller_name, seller.phone_number AS seller_phone
    FROM properties p
    INNER JOIN sale_properties s ON s.property_id = p.property_id
    LEFT JOIN sellers seller ON seller.seller_id = p.seller_id
    WHERE p.property_id = $1
  `, propertyId);
  return rows[0] || null;
};

export const createSaleProperty = async (data, files = {}) => {
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
    const propRes = await tx.$queryRawUnsafe(
      `INSERT INTO properties (property_type, seller_id, title, description, contact_phone, address, latitude, longitude, district_id, taluk_id, village_id, area_id, status, live_image)
       VALUES ('sale', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING property_id`,
      toInt(sellerId), toStr(data.title), toStr(data.description), toStr(phone), toStr(data.address),
      toFloat(data.latitude), toFloat(data.longitude), toInt(data.district_id), toInt(data.taluk_id),
      toInt(data.village_id), toInt(data.area_id), toStr(data.status || 'Nil Booking'), null
    );
    const propertyId = propRes[0].property_id;
    const saleType = toStr(data.sale_type)?.toLowerCase();
    await tx.$executeRawUnsafe(
      `INSERT INTO sale_properties (property_id, sale_type, price, area_size, street_name_or_road_name, survey_number, boundary_north, boundary_south, boundary_east, boundary_west, sale_status, drawing_image, total_units_count, booked_units, open_units, alternate_contact_phone, alternate_seller_name, layout_name, dtcp, parent_document, sub_registrar_office, gift_deed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
      propertyId, toStr(data.sale_type), toInt(data.price) || 0, toStr(data.area_size),
      toStr(data.street_name_or_road_name), toStr(data.survey_number),
      toStr(data.boundary_north), toStr(data.boundary_south), toStr(data.boundary_east), toStr(data.boundary_west),
      toStr(data.sale_status), null, toInt(data.total_units_count) || 0,
      toStr(data.booked_units) || 0, toStr(data.open_units) || 0,
      toStr(data.alternate_contact_phone), toStr(data.alternate_seller_name),
      toStr(data.layout_name), toStr(data.dtcp), toStr(data.parent_document),
      toStr(data.sub_registrar_office), toStr(data.gift_deed)
    );
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

  return { property_id: propertyId, seller_id: sellerId, seller_name: sellerName };
};

export const updateSaleProperty = async (propertyId, data, files = {}) => {
  const filesToDelete = [];

  const currentProp = await prisma.$queryRawUnsafe(
    `SELECT p.seller_id, p.live_image, s.drawing_image, s.sale_type FROM properties p LEFT JOIN sale_properties s ON s.property_id = p.property_id WHERE p.property_id = $1`,
    propertyId
  );
  if (!currentProp.length) throw new Error('Property not found');
  const { seller_id: currentSellerId, live_image: currentLiveImage, drawing_image: currentDrawingImage } = currentProp[0];

  const phone = data.contact_phone;
  const sellerName = data.seller_name || '';
  const saleType = toStr(data.sale_type ?? currentProp[0].sale_type)?.toLowerCase();
  const shouldStoreDrawing = saleType === 'plot' || saleType === 'flat';

  let liveImageUrl = currentLiveImage;
  if (files.live_image) {
    const upload = await uploadToCloudflare(propertyId, 'live_image', files.live_image);
    liveImageUrl = upload.url;
    if (currentLiveImage) filesToDelete.push(currentLiveImage);
  }

  let drawingImageUrl = shouldStoreDrawing ? currentDrawingImage : null;
  if (files.drawing_image && shouldStoreDrawing) {
    const upload = await uploadToCloudflare(propertyId, 'drawing_image', files.drawing_image);
    drawingImageUrl = upload.url;
    if (currentDrawingImage) filesToDelete.push(currentDrawingImage);
  }

  await prisma.$transaction(async (tx) => {
    if (phone) {
      const sc = await tx.$queryRawUnsafe('SELECT seller_id FROM sellers WHERE seller_id = $1', currentSellerId);
      if (sc.length > 0) {
        await tx.$executeRawUnsafe('UPDATE sellers SET name = $1, phone_number = $2 WHERE seller_id = $3', sellerName, phone, currentSellerId);
      } else {
        const ns = await tx.$queryRawUnsafe('INSERT INTO sellers (name, phone_number) VALUES ($1, $2) RETURNING seller_id', sellerName, phone);
        await tx.$executeRawUnsafe('UPDATE properties SET seller_id = $1 WHERE property_id = $2', ns[0].seller_id, propertyId);
      }
    }
    await tx.$executeRawUnsafe(
      `UPDATE properties SET title=$1, description=$2, contact_phone=$3, address=$4, latitude=$5, longitude=$6, district_id=$7, taluk_id=$8, village_id=$9, area_id=$10, status=$11, live_image=$12 WHERE property_id=$13`,
      toStr(data.title), toStr(data.description), toStr(phone), toStr(data.address),
      toFloat(data.latitude), toFloat(data.longitude), toInt(data.district_id), toInt(data.taluk_id),
      toInt(data.village_id), toInt(data.area_id), toStr(data.status), liveImageUrl, propertyId
    );
    await tx.$executeRawUnsafe(
      `UPDATE sale_properties SET sale_type=$1, price=$2, area_size=$3, street_name_or_road_name=$4, survey_number=$5, boundary_north=$6, boundary_south=$7, boundary_east=$8, boundary_west=$9, sale_status=$10, total_units_count=$11, booked_units=$12, open_units=$13, drawing_image=$14, alternate_contact_phone=$15, alternate_seller_name=$16, layout_name=$17, dtcp=$18, parent_document=$19, sub_registrar_office=$20, gift_deed=$21 WHERE property_id=$22`,
      toStr(data.sale_type), toInt(data.price) || 0, toStr(data.area_size), toStr(data.street_name_or_road_name),
      toStr(data.survey_number), toStr(data.boundary_north), toStr(data.boundary_south),
      toStr(data.boundary_east), toStr(data.boundary_west), toStr(data.sale_status),
      toInt(data.total_units_count) || 0, toStr(data.booked_units) || 0, toStr(data.open_units) || 0,
      drawingImageUrl, toStr(data.alternate_contact_phone), toStr(data.alternate_seller_name),
      toStr(data.layout_name), toStr(data.dtcp), toStr(data.parent_document),
      toStr(data.sub_registrar_office), toStr(data.gift_deed), propertyId
    );
  });

  await Promise.all(filesToDelete.map(deleteFromCloudflare));
  return { property_id: propertyId, seller_name: sellerName };
};

export const removeSaleProperty = async (propertyId) => {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('DELETE FROM sale_properties WHERE property_id=$1', propertyId);
    await tx.$executeRawUnsafe('DELETE FROM properties WHERE property_id=$1', propertyId);
  });
  return { success: true };
};

export const updateSaleStatus = async (propertyId, status) => {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE properties SET status = $1, updated_at = NOW() WHERE property_id = $2 AND property_type = 'sale' RETURNING property_id, status`,
    status, propertyId
  );
  if (!rows.length) throw new Error('Property not found');
  return rows[0];
};

export const updateDrawingImage = async (propertyId, file) => {
  const rows = await prisma.$queryRawUnsafe('SELECT drawing_image FROM sale_properties WHERE property_id = $1', propertyId);
  if (!rows.length) throw new Error('Sale property not found');
  const oldUrl = rows[0].drawing_image;
  const upload = await uploadToCloudflare(propertyId, 'drawing_image', file);
  await prisma.$executeRawUnsafe('UPDATE sale_properties SET drawing_image = $1 WHERE property_id = $2', upload.url, propertyId);
  if (oldUrl) await deleteFromCloudflare(oldUrl);
  return { drawing_image: upload.url };
};
