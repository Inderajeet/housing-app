const normalizeText = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

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

export const getPropertyHref = (property) => {
  const mode = getPropertyMode(property);
  const category = getPropertyCategory(property);
  const slug = getPropertySlug(property);

  return `/property/${mode}/${category}/${slug}`;
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
