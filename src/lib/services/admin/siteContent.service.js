import prisma from '../../prisma.js';

export const getBookingFlow = async (flowType) => {
  const stages = await prisma.$queryRawUnsafe(
    `SELECT id, stage_key, sort_order, title, timeframe, next_label
     FROM booking_flow_stages
     WHERE flow_type = $1
     ORDER BY sort_order ASC`,
    flowType
  );

  for (const stage of stages) {
    const [subtitles, points] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT id, subtitle_text, sort_order FROM booking_flow_subtitles WHERE stage_id = $1 ORDER BY sort_order ASC`,
        stage.id
      ),
      prisma.$queryRawUnsafe(
        `SELECT id, point_text, sort_order FROM booking_flow_points WHERE stage_id = $1 ORDER BY sort_order ASC`,
        stage.id
      ),
    ]);
    stage.subtitles = subtitles;
    stage.points = points;
  }

  return stages;
};

export const addStage = async (flowType, stageKey, title, timeframe, nextLabel) => {
  const countRows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS cnt FROM booking_flow_stages WHERE flow_type=$1`,
    flowType
  );
  const sortOrder = countRows[0].cnt;
  const rows = await prisma.$queryRawUnsafe(
    `INSERT INTO booking_flow_stages (flow_type, stage_key, sort_order, title, timeframe, next_label)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    flowType, stageKey, sortOrder, title, timeframe || null, nextLabel
  );
  const stage = rows[0];
  stage.subtitles = [];
  stage.points = [];
  return stage;
};

export const deleteStage = async (id) => {
  await prisma.$executeRawUnsafe(`DELETE FROM booking_flow_stages WHERE id=$1`, Number(id));
  return { deleted: true };
};

export const updateStage = async (id, { title, timeframe, next_label }) => {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE booking_flow_stages SET title=$1, timeframe=$2, next_label=$3, updated_at=NOW() WHERE id=$4 RETURNING *`,
    title, timeframe || null, next_label, Number(id)
  );
  return rows[0];
};

export const addSubtitle = async (stageId, text, sortOrder = 0) => {
  const rows = await prisma.$queryRawUnsafe(
    `INSERT INTO booking_flow_subtitles (stage_id, subtitle_text, sort_order) VALUES ($1, $2, $3) RETURNING *`,
    Number(stageId), text, Number(sortOrder)
  );
  return rows[0];
};

export const updateSubtitle = async (id, text) => {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE booking_flow_subtitles SET subtitle_text=$1 WHERE id=$2 RETURNING *`,
    text, Number(id)
  );
  return rows[0];
};

export const deleteSubtitle = async (id) => {
  await prisma.$executeRawUnsafe(`DELETE FROM booking_flow_subtitles WHERE id=$1`, Number(id));
  return { deleted: true };
};

export const addPoint = async (stageId, text, sortOrder = 0) => {
  const rows = await prisma.$queryRawUnsafe(
    `INSERT INTO booking_flow_points (stage_id, point_text, sort_order) VALUES ($1, $2, $3) RETURNING *`,
    Number(stageId), text, Number(sortOrder)
  );
  return rows[0];
};

export const updatePoint = async (id, text) => {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE booking_flow_points SET point_text=$1 WHERE id=$2 RETURNING *`,
    text, Number(id)
  );
  return rows[0];
};

export const deletePoint = async (id) => {
  await prisma.$executeRawUnsafe(`DELETE FROM booking_flow_points WHERE id=$1`, Number(id));
  return { deleted: true };
};

export const getServices = async () => {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, stage_key, flow_type, service_text, sort_order
     FROM booking_flow_services
     ORDER BY stage_key, flow_type, sort_order ASC`
  );
  return rows;
};

export const addService = async (stageKey, flowType, text, sortOrder = 0) => {
  const rows = await prisma.$queryRawUnsafe(
    `INSERT INTO booking_flow_services (stage_key, flow_type, service_text, sort_order) VALUES ($1, $2, $3, $4) RETURNING *`,
    stageKey, flowType, text, Number(sortOrder)
  );
  return rows[0];
};

export const updateService = async (id, text) => {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE booking_flow_services SET service_text=$1 WHERE id=$2 RETURNING *`,
    text, Number(id)
  );
  return rows[0];
};

export const deleteService = async (id) => {
  await prisma.$executeRawUnsafe(`DELETE FROM booking_flow_services WHERE id=$1`, Number(id));
  return { deleted: true };
};

export const getAllHeadings = async () => {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT content_key, content_value FROM site_content ORDER BY content_key ASC`
  );
  return rows;
};

export const updateHeading = async (key, value) => {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE site_content SET content_value=$1, updated_at=NOW() WHERE content_key=$2 RETURNING *`,
    value, key
  );
  return rows[0];
};

export const getGalleryImages = async () => {
  try {
    return await prisma.$queryRawUnsafe(
      `SELECT id, image_url, image_key, caption, sort_order FROM site_gallery ORDER BY sort_order ASC, id ASC`
    );
  } catch {
    // caption column not yet migrated — return without it
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, image_url, image_key, '' AS caption, sort_order FROM site_gallery ORDER BY sort_order ASC, id ASC`
    );
    return rows.map(r => ({ ...r, caption: '' }));
  }
};

export const addGalleryImage = async (imageUrl, imageKey, sortOrder = 0, caption = '') => {
  const rows = await prisma.$queryRawUnsafe(
    `INSERT INTO site_gallery (image_url, image_key, sort_order, caption) VALUES ($1, $2, $3, $4) RETURNING *`,
    imageUrl, imageKey, Number(sortOrder), caption
  );
  return rows[0];
};

export const updateGalleryImage = async (id, { caption, sort_order } = {}) => {
  const fields = [];
  const values = [];
  if (caption !== undefined) { fields.push(`caption=$${fields.length + 1}`); values.push(caption); }
  if (sort_order !== undefined) { fields.push(`sort_order=$${fields.length + 1}`); values.push(Number(sort_order)); }
  if (!fields.length) return null;
  values.push(Number(id));
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE site_gallery SET ${fields.join(', ')} WHERE id=$${values.length} RETURNING *`,
    ...values
  );
  return rows[0];
};

export const deleteGalleryImage = async (id) => {
  const rows = await prisma.$queryRawUnsafe(
    `DELETE FROM site_gallery WHERE id=$1 RETURNING id, image_key, image_url`,
    Number(id)
  );
  return rows[0];
};

export const getFrontendContent = async (flowType) => {
  const [headings, stages, allServices, galleryImages] = await Promise.all([
    getAllHeadings(),
    getBookingFlow(flowType),
    getServices(),
    getGalleryImages(),
  ]);

  const headingsMap = Object.fromEntries(headings.map(h => [h.content_key, h.content_value]));

  const servicesMap = {};
  const offerPoints = [];
  const advantagePoints = { sale_tick: [], sale_cross: [], rent_tick: [], rent_cross: [] };

  for (const svc of allServices) {
    if (svc.stage_key === 'ADVANTAGE') {
      if (svc.flow_type === 'sale_tick') advantagePoints.sale_tick.push(svc.service_text);
      else if (svc.flow_type === 'sale_cross') advantagePoints.sale_cross.push(svc.service_text);
      else if (svc.flow_type === 'rent_tick') advantagePoints.rent_tick.push(svc.service_text);
      else if (svc.flow_type === 'rent_cross') advantagePoints.rent_cross.push(svc.service_text);
    } else if (svc.flow_type === 'offer' && svc.stage_key === 'VISIT_NEGOTIATE') {
      offerPoints.push(svc.service_text);
    } else if (svc.flow_type === 'all' || svc.flow_type === flowType) {
      if (!servicesMap[svc.stage_key]) servicesMap[svc.stage_key] = [];
      servicesMap[svc.stage_key].push(svc.service_text);
    }
  }

  return { headings: headingsMap, stages, services: servicesMap, offerPoints, advantagePoints, galleryImages };
};
