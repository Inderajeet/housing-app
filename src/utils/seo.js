const unique = (values) => Array.from(new Set(values.filter(Boolean)));

// "periyar-nagar" → "Periyar Nagar"
export const titleCaseSlug = (slug) =>
  String(slug || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Human-readable property type for a given mode + category URL slug
export const getCategoryLabel = (mode, category) => {
  if (String(mode).toLowerCase() === 'sale') {
    return category ? titleCaseSlug(category) : 'Property';
  }
  // rent
  if (category === '1') return '1 BHK';
  if (category === '2') return '2 BHK';
  if (category === '3') return '3+ BHK';
  if (String(category).toLowerCase() === 'commercial') return 'Commercial';
  return 'Residential';
};

// Format Indian currency for meta descriptions
export const formatPrice = (value, isRent = false) => {
  const num = Number(value);
  if (!num) return null;
  const str = `₹${num.toLocaleString('en-IN')}`;
  return isRent ? `${str}/month` : str;
};

// Build area string from property data
export const getAreaLabel = (property = {}) => {
  if (property.extent_area && property.extent_unit) return `${property.extent_area} ${property.extent_unit}`;
  if (property.area_size) return `${property.area_size} sqft`;
  return null;
};

export const getLocationParts = (source = {}) =>
  [
    source.village_name || source.village,
    source.taluk_name || source.taluk,
    source.district_name || source.district,
  ].filter(Boolean);

export const getLocationLabel = (source = {}, fallback = 'Tamil Nadu') => {
  const parts = getLocationParts(source);
  return parts.length > 0 ? parts.join(', ') : fallback;
};

export const getPropertyDisplayName = (property = {}) =>
  property.title || property.formatted_id || 'Property';

export const getTransactionLabel = (value) =>
  String(value || '').toLowerCase() === 'sale' ? 'Sale' : 'Rent';

export const getPropertyTypeLabel = (property = {}) => {
  if (property.rent_amount) {
    const propertyUse = String(property.property_use || '').toLowerCase();
    if (propertyUse === 'commercial') return 'commercial property';
    if (property.bhk) return `${property.bhk} BHK property`;
    return 'rental property';
  }

  const saleType = String(property.sale_type || '').trim();
  return saleType ? `${saleType} property` : 'property';
};

export const getPriceLabel = (property = {}) => {
  const rawPrice = property.rent_amount || property.sale_price || property.price;
  const numericPrice = Number(rawPrice);
  if (!numericPrice) return '';

  if (property.rent_amount) {
    return `Rs ${numericPrice.toLocaleString('en-IN')} rent`;
  }

  return `Rs ${numericPrice.toLocaleString('en-IN')}`;
};

export const getKeywordString = (values = []) => unique(values).join(', ');
