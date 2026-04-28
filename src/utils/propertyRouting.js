const normalizeText = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const normalizeUrlName = normalizeText;

export const normalizeMode = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'sale' ? 'sale' : 'rent';
};

export const normalizeCategory = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized || null;
};

export const getSearchHref = (mode, category) => {
  const params = new URLSearchParams();
  params.set('type', normalizeMode(mode));

  const normalizedCategory = normalizeCategory(category);
  if (normalizedCategory) {
    params.set('category', normalizedCategory);
  }

  return `/search?${params.toString()}`;
};

export const getPropertyMode = (property) =>
  property?.rent_amount !== null &&
  property?.rent_amount !== undefined &&
  property?.rent_amount !== ''
    ? 'rent'
    : 'sale';

export const getPropertyCategory = (property) => {
  const mode = getPropertyMode(property);

  if (mode === 'rent') {
    const use = String(property?.property_use || '').toLowerCase();
    if (use === 'commercial') return 'commercial';

    const bhk = String(property?.bhk || '').trim().toLowerCase();
    if (bhk.startsWith('1')) return '1';
    if (bhk.startsWith('2')) return '2';
    if (bhk.startsWith('3') || bhk.startsWith('4')) return '3';
    return 'residential';
  }

  return normalizeCategory(property?.sale_type) || 'property';
};

export const getPropertySlug = (property) =>
  normalizeText(property?.formatted_id) ||
  normalizeText(property?.title) ||
  String(property?.property_id || property?.id || '').trim();

const getPropertyDescSlug = (property) => {
  const mode = getPropertyMode(property);
  const location = normalizeText(
    property?.village_name || property?.taluk_name || property?.district_name || ''
  );

  if (mode === 'rent') {
    const use = String(property?.property_use || '').toLowerCase().trim();
    if (use === 'commercial') {
      return location ? `commercial-for-rent-in-${location}` : 'commercial-for-rent';
    }
    const bhkRaw = String(property?.bhk || '').trim();
    const bhkNum =
      bhkRaw.startsWith('1') ? '1bhk' :
      bhkRaw.startsWith('2') ? '2bhk' :
      (bhkRaw.startsWith('3') || bhkRaw.startsWith('4') || parseInt(bhkRaw) >= 3) ? '3bhk' :
      'residential';
    return location ? `${bhkNum}-residential-for-rent-in-${location}` : `${bhkNum}-residential-for-rent`;
  }

  // Sale
  const saleType = normalizeText(property?.sale_type || '') || 'property';
  const bhkRaw = String(property?.bhk || '').trim();
  if (bhkRaw && ['flat', 'house'].includes(saleType)) {
    const bhkNum =
      bhkRaw.startsWith('1') ? '1bhk' :
      bhkRaw.startsWith('2') ? '2bhk' :
      (bhkRaw.startsWith('3') || parseInt(bhkRaw) >= 3) ? '3bhk' : '';
    if (bhkNum) {
      return location ? `${bhkNum}-${saleType}-for-sale-in-${location}` : `${bhkNum}-${saleType}-for-sale`;
    }
  }
  return location ? `${saleType}-for-sale-in-${location}` : `${saleType}-for-sale`;
};

export const getPropertyHref = (property) => {
  const mode = getPropertyMode(property);
  const descSlug = getPropertyDescSlug(property);
  const id = getPropertySlug(property);
  return `/property/${mode}/${descSlug}/${id}`;
};

export const matchesPropertyIdentifier = (property, identifier) => {
  const normalizedIdentifier = normalizeText(identifier);
  if (!normalizedIdentifier) return false;

  return [
    property?.formatted_id,
    property?.title,
    property?.property_id,
    property?.id,
  ].some((value) => normalizeText(value) === normalizedIdentifier);
};
