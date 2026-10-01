import prisma from '../prisma.js';

// Optional sale/rent + category scope so dropdowns only list places with matching properties
const typeFilter = (type, category = '') => {
  if (type !== 'rent' && type !== 'sale') return '';
  let sql = ` AND p.property_type = '${type}'`;
  const cat = String(category || '').toLowerCase();
  if (type === 'rent') {
    let cond = '';
    if (['commercial', 'residential', 'other'].includes(cat)) cond = ` AND LOWER(r.property_use) = '${cat}'`;
    else if (cat === '3') cond = ' AND CAST(r.bhk AS INTEGER) >= 3';
    else if (/^\d+$/.test(cat)) cond = ` AND r.bhk = '${cat}'`;
    if (cond) sql += ` AND EXISTS (SELECT 1 FROM rent_properties r WHERE r.property_id = p.property_id${cond})`;
  } else if (/^[a-z0-9_-]+$/.test(cat)) {
    sql += ` AND EXISTS (SELECT 1 FROM sale_properties s WHERE s.property_id = p.property_id AND s.sale_type = '${cat}')`;
  }
  return sql;
};

export async function getAllDistricts({ all = false, type = '', category = '' } = {}) {
  const rows = await prisma.$queryRawUnsafe(
    all
      ? `SELECT d.district_id, d.district_name, d.district_code, d.latitude, d.longitude
         FROM districts d
         ORDER BY d.district_name ASC`
      : `SELECT d.district_id, d.district_name, d.district_code, d.latitude, d.longitude
         FROM districts d
         WHERE EXISTS (
           SELECT 1 FROM properties p WHERE p.district_id = d.district_id AND p.status = 'approved'${typeFilter(type, category)}
         )
         ORDER BY d.district_name ASC`
  );
  return rows;
}

export async function getTaluksByDistrict(districtId, { all = false, type = '', category = '' } = {}) {
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
             SELECT 1 FROM properties p WHERE p.taluk_id = t.taluk_id AND p.status = 'approved'${typeFilter(type, category)}
           )
         ORDER BY t.taluk_name ASC`,
    districtId
  );
  return rows;
}

export async function getVillagesByTaluk(talukId, { all = false, type = '', category = '' } = {}) {
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
             SELECT 1 FROM properties p WHERE p.village_id = v.village_id AND p.status = 'approved'${typeFilter(type, category)}
           )
         ORDER BY v.village_name ASC`,
    talukId
  );
  return rows;
}
