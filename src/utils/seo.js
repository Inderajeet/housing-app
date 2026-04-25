const unique = (values) => Array.from(new Set(values.filter(Boolean)));

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
