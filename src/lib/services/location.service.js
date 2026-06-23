import prisma from '../prisma.js';

export async function getAllDistricts({ all = false } = {}) {
  const rows = await prisma.$queryRawUnsafe(
    all
      ? `SELECT d.district_id, d.district_name, d.district_code, d.latitude, d.longitude
         FROM districts d
         ORDER BY d.district_name ASC`
      : `SELECT d.district_id, d.district_name, d.district_code, d.latitude, d.longitude
         FROM districts d
         WHERE EXISTS (
           SELECT 1 FROM properties p WHERE p.district_id = d.district_id AND p.status = 'approved'
         )
         ORDER BY d.district_name ASC`
  );
  return rows;
}

export async function getTaluksByDistrict(districtId, { all = false } = {}) {
  const rows = await prisma.$queryRawUnsafe(
    all
      ? `SELECT t.taluk_id, t.taluk_name, t.district_id, t.latitude, t.longitude
         FROM taluks t
         WHERE t.district_id = $1
         ORDER BY t.taluk_name ASC`
      : `SELECT t.taluk_id, t.taluk_name, t.district_id, t.latitude, t.longitude
         FROM taluks t
         WHERE t.district_id = $1
           AND EXISTS (
             SELECT 1 FROM properties p WHERE p.taluk_id = t.taluk_id AND p.status = 'approved'
           )
         ORDER BY t.taluk_name ASC`,
    districtId
  );
  return rows;
}

export async function getVillagesByTaluk(talukId, { all = false } = {}) {
  const rows = await prisma.$queryRawUnsafe(
    all
      ? `SELECT v.village_id, v.village_name, v.taluk_id, v.latitude, v.longitude
         FROM villages v
         WHERE v.taluk_id = $1
         ORDER BY v.village_name ASC`
      : `SELECT v.village_id, v.village_name, v.taluk_id, v.latitude, v.longitude
         FROM villages v
         WHERE v.taluk_id = $1
           AND EXISTS (
             SELECT 1 FROM properties p WHERE p.village_id = v.village_id AND p.status = 'approved'
           )
         ORDER BY v.village_name ASC`,
    talukId
  );
  return rows;
}
