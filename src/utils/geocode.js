export const forwardGeocode = async (address) => {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API;
  if (!key) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === 'OK' && data.results.length > 0) {
    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  }
  return null;
};

export const reverseGeocodeDetailed = async (lat, lng) => {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API;
  if (!key) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' || !data.results.length) return null;

  const result = data.results[0];
  const comps = result.address_components || [];
  const get = (type) => comps.find((c) => c.types.includes(type))?.long_name || '';

  return {
    address: result.formatted_address || '',
    district: get('administrative_area_level_3') || get('administrative_area_level_2'),
    taluk: get('administrative_area_level_3') || get('sublocality_level_1'),
    village: get('locality') || get('sublocality_level_2') || get('sublocality'),
  };
};
