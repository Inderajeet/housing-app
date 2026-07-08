import QRCode from 'qrcode';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tnpropertymandi.in';

export const getPropertyPublicUrl = (property, propertyType) => {
  const mode = propertyType === 'rent' ? 'rent' : 'sale';
  return `${SITE_URL}/property/${mode}/property/${property.formatted_id || property.property_id}`;
};

export const downloadPropertyQr = async (property, propertyType) => {
  const url = getPropertyPublicUrl(property, propertyType);
  const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `QR_${property.formatted_id || property.property_id}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
