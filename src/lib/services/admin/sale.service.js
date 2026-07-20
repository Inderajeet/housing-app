import prisma from '../../prisma.js';
import { uploadToCloudflare, deleteFromCloudflare } from '../../uploadToCloudflare.js';

const toInt = (v) => (v === '' || v === undefined || v === null ? null : parseInt(v, 10));
const toFloat = (v) => (v === '' || v === undefined || v === null ? null : parseFloat(v));
const toStr = (v) => (v === '' || v === undefined ? null : v);

const normalizeDtcp = (value) => String(value || '').trim();

const assertUniqueDtcp = async (tx, dtcp, propertyId = null) => {
  const normalized = normalizeDtcp(dtcp);
  if (!normalized) return;

  const existing = propertyId
    ? await tx.$queryRawUnsafe(
        `SELECT sp.property_id
         FROM sale_properties sp
         WHERE LOWER(TRIM(sp.dtcp)) = LOWER($1)
           AND sp.property_id <> $2
         LIMIT 1`,
        normalized,
        propertyId
      )
    : await tx.$queryRawUnsafe(
        `SELECT sp.property_id
         FROM sale_properties sp
         WHERE LOWER(TRIM(sp.dtcp)) = LOWER($1)
         LIMIT 1`,
        normalized
      );

  if (existing.length > 0) {
    const error = new Error('DTCP number already exists for another property');
    error.code = 'DTCP_EXISTS';
    throw error;
  }
};

const allocateFormattedId = async (tx, districtId) => {
  const did = toInt(districtId);
  if (!did) return null;

  const rows = await tx.$queryRawUnsafe(
    `SELECT district_code, COALESCE(last_property_number, 0) AS last_property_number
     FROM districts
     WHERE district_id = $1
     FOR UPDATE`,
    did
  );
  if (!rows.length) return null;

  const districtCode = rows[0].district_code;
  const nextNumber = Number(rows[0].last_property_number || 0) + 1;

  await tx.$executeRawUnsafe(
    'UPDATE districts SET last_property_number = $1 WHERE district_id = $2',
    nextNumber,
    did
  );

  return `${districtCode}-${String(nextNumber).padStart(4, '0')}`;
};

export const getAll = async () => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT p.property_id, p.formatted_id, p.created_at, p.title, p.description,
      p.seller_id, p.contact_phone, p.address, p.status,
      COALESCE(bc.booked_people_count, 0) AS booked_people_count,
      p.live_image, p.latitude, p.longitude, p.district_id, p.taluk_id, p.village_id, p.area_id,
      p.area_speed, p.amenities_rating, p.utilities_rating, p.legal_rating,
      s.sale_type, s.price, s.rate_unit, s.area_size, s.extension, s.street_name_or_road_name, s.survey_number,
      s.boundary_north, s.boundary_south, s.boundary_east, s.boundary_west, s.sale_status,
      s.drawing_image, s.total_units_count, s.booked_units, s.open_units,
      s.alternate_contact_phone, s.alternate_seller_name, s.listing_person_phone, s.layout_name, s.dtcp,
      s.parent_document, s.sub_registrar_office, s.gift_deed,
      s.token_amount, s.token_paid_to, s.sold_rate, s.sold_date, s.advance_amount,
      s.legal_value, s.area_sales_speed, s.facing, s.road_width,
      s.videos->>'url' AS video_url,
      seller.name AS seller_name, seller.phone_number AS seller_phone,
      d.district_name, t.taluk_name, v.village_name
    FROM properties p
    INNER JOIN sale_properties s ON s.property_id = p.property_id
    LEFT JOIN (
      SELECT property_id, COUNT(DISTINCT buyer_id)::INT AS booked_people_count
      FROM bookings
      WHERE unit_type = 'sale'
      GROUP BY property_id
    ) bc ON bc.property_id = p.property_id
    LEFT JOIN sellers seller ON seller.seller_id = p.seller_id
    LEFT JOIN districts d ON d.district_id = p.district_id
    LEFT JOIN taluks t ON t.taluk_id = p.taluk_id
    LEFT JOIN villages v ON v.village_id = p.village_id
    WHERE p.property_type = 'sale'
    ORDER BY p.formatted_id ASC NULLS LAST
  `);
  return rows;
};

export const getById = async (propertyId) => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT p.property_id, p.formatted_id, p.created_at, p.title, p.description,
      p.seller_id, p.contact_phone, p.address, p.status,
      COALESCE((SELECT COUNT(DISTINCT buyer_id)::INT FROM bookings WHERE property_id = p.property_id AND unit_type = 'sale'), 0) AS booked_people_count,
      p.live_image, p.latitude, p.longitude, p.district_id, p.taluk_id, p.village_id, p.area_id,
      p.area_speed, p.amenities_rating, p.utilities_rating, p.legal_rating,
      s.sale_type, s.price, s.rate_unit, s.area_size, s.extension, s.street_name_or_road_name, s.survey_number,
      s.boundary_north, s.boundary_south, s.boundary_east, s.boundary_west, s.sale_status,
      s.drawing_image, s.total_units_count, s.booked_units, s.open_units,
      s.alternate_contact_phone, s.alternate_seller_name, s.listing_person_phone, s.layout_name, s.dtcp,
      s.parent_document, s.sub_registrar_office, s.gift_deed,
      s.token_amount, s.token_paid_to, s.sold_rate, s.sold_date, s.advance_amount,
      s.legal_value, s.area_sales_speed, s.facing, s.road_width,
      s.videos->>'url' AS video_url,
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
    await assertUniqueDtcp(tx, data.dtcp);
    const propRes = await tx.$queryRawUnsafe(
      `INSERT INTO properties (property_type, seller_id, title, description, contact_phone, address, latitude, longitude, district_id, taluk_id, village_id, area_id, status, live_image)
       VALUES ('sale', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING property_id`,
      toInt(sellerId), toStr(data.title), toStr(data.description), toStr(phone), toStr(data.address),
      toFloat(data.latitude), toFloat(data.longitude), toInt(data.district_id), toInt(data.taluk_id),
      toInt(data.village_id), toInt(data.area_id), toStr(data.status || 'Pending'), null
    );
    const propertyId = propRes[0].property_id;
    const saleType = toStr(data.sale_type)?.toLowerCase();
    await tx.$executeRawUnsafe(
      `INSERT INTO sale_properties (property_id, sale_type, price, rate_unit, area_size, street_name_or_road_name, survey_number, boundary_north, boundary_south, boundary_east, boundary_west, sale_status, drawing_image, total_units_count, booked_units, open_units, alternate_contact_phone, alternate_seller_name, listing_person_phone, layout_name, dtcp, parent_document, sub_registrar_office, gift_deed, legal_value, area_sales_speed, facing, road_width)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)`,
      propertyId, toStr(data.sale_type), toInt(data.price) || 0, toStr(data.rate_unit), toStr(data.area_size),
      toStr(data.street_name_or_road_name), toStr(data.survey_number),
      toStr(data.boundary_north), toStr(data.boundary_south), toStr(data.boundary_east), toStr(data.boundary_west),
      toStr(data.sale_status), null, toInt(data.total_units_count) || 0,
      toStr(data.booked_units) || 0, toStr(data.open_units) || 0,
      toStr(data.alternate_contact_phone), toStr(data.alternate_seller_name),
      toStr(data.listing_person_phone), toStr(data.layout_name), toStr(data.dtcp), toStr(data.parent_document),
      toStr(data.sub_registrar_office), toStr(data.gift_deed),
      toStr(data.legal_value) || 'A+', toFloat(data.area_sales_speed),
      toStr(data.facing), toStr(data.road_width)
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
    `SELECT p.seller_id, p.live_image, p.district_id, s.drawing_image, s.sale_type FROM properties p LEFT JOIN sale_properties s ON s.property_id = p.property_id WHERE p.property_id = $1`,
    propertyId
  );
  if (!currentProp.length) throw new Error('Property not found');
  const { seller_id: currentSellerId, live_image: currentLiveImage, drawing_image: currentDrawingImage, district_id: currentDistrictId } = currentProp[0];

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
    await assertUniqueDtcp(tx, data.dtcp, propertyId);
    if (toInt(data.district_id) !== toInt(currentDistrictId)) {
      const newFormattedId = await allocateFormattedId(tx, data.district_id);
      await tx.$executeRawUnsafe('UPDATE properties SET formatted_id = $1 WHERE property_id = $2', newFormattedId, propertyId);
    }
    await tx.$executeRawUnsafe(
      `UPDATE properties SET title=$1, description=$2, contact_phone=$3, address=$4, latitude=$5, longitude=$6, district_id=$7, taluk_id=$8, village_id=$9, area_id=$10, status=$11, live_image=$12, area_speed=$13, amenities_rating=$14, utilities_rating=$15, legal_rating=$16 WHERE property_id=$17`,
      toStr(data.title), toStr(data.description), toStr(phone), toStr(data.address),
      toFloat(data.latitude), toFloat(data.longitude), toInt(data.district_id), toInt(data.taluk_id),
      toInt(data.village_id), toInt(data.area_id), toStr(data.status), liveImageUrl,
      toFloat(data.area_speed), toFloat(data.amenities_rating), toFloat(data.utilities_rating), toFloat(data.legal_rating),
      propertyId
    );
    await tx.$executeRawUnsafe(
      `UPDATE sale_properties SET sale_type=$1, price=$2, rate_unit=$3, area_size=$4, street_name_or_road_name=$5, survey_number=$6, boundary_north=$7, boundary_south=$8, boundary_east=$9, boundary_west=$10, sale_status=$11, total_units_count=$12, booked_units=$13, open_units=$14, drawing_image=$15, alternate_contact_phone=$16, alternate_seller_name=$17, listing_person_phone=$18, layout_name=$19, dtcp=$20, parent_document=$21, sub_registrar_office=$22, gift_deed=$23, token_amount=$24, token_paid_to=$25, sold_rate=$26, sold_date=$27, advance_amount=$28, extension=$29, legal_value=$30, area_sales_speed=$31, facing=$32, road_width=$33 WHERE property_id=$34`,
      toStr(data.sale_type), toFloat(data.price) || 0, toStr(data.rate_unit), toStr(data.area_size), toStr(data.street_name_or_road_name),
      toStr(data.survey_number), toStr(data.boundary_north), toStr(data.boundary_south),
      toStr(data.boundary_east), toStr(data.boundary_west), toStr(data.sale_status),
      toInt(data.total_units_count) || 0, toStr(data.booked_units) || 0, toStr(data.open_units) || 0,
      drawingImageUrl, toStr(data.alternate_contact_phone), toStr(data.alternate_seller_name),
      toStr(data.listing_person_phone), toStr(data.layout_name), toStr(data.dtcp), toStr(data.parent_document),
      toStr(data.sub_registrar_office), toStr(data.gift_deed),
      toFloat(data.token_amount), toStr(data.token_paid_to),
      toFloat(data.sold_rate), data.sold_date && data.sold_date !== '' ? new Date(data.sold_date) : null,
      toFloat(data.advance_amount), toStr(data.extension),
      toStr(data.legal_value) || 'A+', toFloat(data.area_sales_speed),
      toStr(data.facing), toStr(data.road_width), propertyId
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

export const updateDrawingImageByUrl = async (propertyId, url) => {
  await prisma.$executeRawUnsafe(
    'UPDATE sale_properties SET drawing_image = $1 WHERE property_id = $2',
    url || null, propertyId
  );
  return { drawing_image: url };
};

export const updateVideoUrl = async (propertyId, videoUrl) => {
  const val = videoUrl ? JSON.stringify({ url: videoUrl }) : null;
  await prisma.$executeRawUnsafe(
    'UPDATE sale_properties SET videos = $1::jsonb WHERE property_id = $2',
    val, propertyId
  );
  return { video_url: videoUrl };
};
