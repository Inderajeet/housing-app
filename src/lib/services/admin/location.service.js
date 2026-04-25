import prisma from '../../prisma.js';
import * as XLSX from 'xlsx';

const parseExcel = (buffer) => {
  const wb = XLSX.read(buffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws);
};

export const getAllDistricts = async () => {
  const rows = await prisma.$queryRawUnsafe(`SELECT district_id, district_name, district_code, latitude, longitude FROM districts ORDER BY district_name ASC`);
  return rows;
};

export const getTaluksByDistrict = async (districtId) => {
  const rows = await prisma.$queryRawUnsafe(`SELECT taluk_id, taluk_name, district_id, latitude, longitude FROM taluks WHERE district_id = $1 ORDER BY taluk_name ASC`, districtId);
  return rows;
};

export const getVillagesByTaluk = async (talukId) => {
  const rows = await prisma.$queryRawUnsafe(`SELECT village_id, village_name, taluk_id, latitude, longitude FROM villages WHERE taluk_id = $1 ORDER BY village_name ASC`, talukId);
  return rows;
};

export const updateDistrict = async (id, data) => {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE districts SET latitude=$1, longitude=$2 WHERE district_id=$3 RETURNING *`,
    data.latitude || null, data.longitude || null, id
  );
  return rows[0];
};

export const bulkUpdateDistrictCoords = async (items) => {
  const ids = items.map(i => i.district_id);
  const lats = items.map(i => i.latitude ?? null);
  const lngs = items.map(i => i.longitude ?? null);
  const rowCount = await prisma.$transaction(async (tx) => {
    return await tx.$executeRawUnsafe(
      `UPDATE districts AS d SET latitude = v.lat::numeric, longitude = v.lng::numeric FROM unnest($1::int[], $2::text[], $3::text[]) AS v(id, lat, lng) WHERE d.district_id = v.id`,
      ids, lats, lngs
    );
  });
  return { updated: rowCount };
};

export const updateTaluk = async (id, data) => {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE taluks SET latitude=$1, longitude=$2 WHERE taluk_id=$3 RETURNING *`,
    data.latitude || null, data.longitude || null, id
  );
  return rows[0];
};

export const bulkUpdateTalukCoords = async (items) => {
  const ids = items.map(i => i.taluk_id);
  const lats = items.map(i => i.latitude ?? null);
  const lngs = items.map(i => i.longitude ?? null);
  const rowCount = await prisma.$transaction(async (tx) => {
    return await tx.$executeRawUnsafe(
      `UPDATE taluks AS t SET latitude = v.lat::numeric, longitude = v.lng::numeric FROM unnest($1::int[], $2::text[], $3::text[]) AS v(id, lat, lng) WHERE t.taluk_id = v.id`,
      ids, lats, lngs
    );
  });
  return { updated: rowCount };
};

export const updateVillage = async (id, data) => {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE villages SET latitude=$1, longitude=$2 WHERE village_id=$3 RETURNING *`,
    data.latitude || null, data.longitude || null, id
  );
  return rows[0];
};

export const bulkUpdateVillageCoords = async (items) => {
  const ids = items.map(i => i.village_id);
  const lats = items.map(i => i.latitude ?? null);
  const lngs = items.map(i => i.longitude ?? null);
  const rowCount = await prisma.$transaction(async (tx) => {
    return await tx.$executeRawUnsafe(
      `UPDATE villages AS v SET latitude = vv.lat::numeric, longitude = vv.lng::numeric FROM unnest($1::int[], $2::text[], $3::text[]) AS vv(id, lat, lng) WHERE v.village_id = vv.id`,
      ids, lats, lngs
    );
  });
  return { updated: rowCount };
};

export const uploadDistrictsFromBuffer = async (buffer) => {
  const rows = parseExcel(buffer);
  const results = { inserted: 0, skipped: 0, errors: [] };
  for (const row of rows) {
    const district_name = row['district_name']?.toString().trim();
    const district_code = row['district_code']?.toString().trim() || null;
    if (!district_name) { results.skipped++; continue; }
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO districts (district_name, district_code) VALUES ($1, $2) ON CONFLICT (district_name) DO UPDATE SET district_code = EXCLUDED.district_code`,
        district_name, district_code
      );
      results.inserted++;
    } catch (e) {
      results.errors.push(e.message);
      results.skipped++;
    }
  }
  return results;
};

export const uploadTaluksFromBuffer = async (buffer) => {
  const rows = parseExcel(buffer);
  const results = { inserted: 0, skipped: 0, errors: [] };
  for (const row of rows) {
    const taluk_name = row['taluk_name']?.toString().trim();
    const district_name = row['district_name']?.toString().trim();
    if (!taluk_name || !district_name) { results.skipped++; continue; }
    try {
      const dRows = await prisma.$queryRawUnsafe(`SELECT district_id FROM districts WHERE LOWER(district_name) = LOWER($1)`, district_name);
      if (!dRows.length) { results.skipped++; results.errors.push(`District not found: ${district_name}`); continue; }
      await prisma.$executeRawUnsafe(
        `INSERT INTO taluks (taluk_name, district_id) VALUES ($1, $2) ON CONFLICT (taluk_name, district_id) DO NOTHING`,
        taluk_name, dRows[0].district_id
      );
      results.inserted++;
    } catch (e) {
      results.errors.push(e.message);
      results.skipped++;
    }
  }
  return results;
};

export const uploadVillagesFromBuffer = async (buffer) => {
  const rows = parseExcel(buffer);
  const results = { inserted: 0, skipped: 0, errors: [] };
  for (const row of rows) {
    const village_name = row['village_name']?.toString().trim();
    const taluk_name = row['taluk_name']?.toString().trim();
    if (!village_name || !taluk_name) { results.skipped++; continue; }
    try {
      const tRows = await prisma.$queryRawUnsafe(`SELECT taluk_id FROM taluks WHERE LOWER(taluk_name) = LOWER($1)`, taluk_name);
      if (!tRows.length) { results.skipped++; results.errors.push(`Taluk not found: ${taluk_name}`); continue; }
      await prisma.$executeRawUnsafe(
        `INSERT INTO villages (village_name, taluk_id) VALUES ($1, $2) ON CONFLICT (village_name, taluk_id) DO NOTHING`,
        village_name, tRows[0].taluk_id
      );
      results.inserted++;
    } catch (e) {
      results.errors.push(e.message);
      results.skipped++;
    }
  }
  return results;
};
