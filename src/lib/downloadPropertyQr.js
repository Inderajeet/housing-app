import QRCode from 'qrcode';
import { getPropertyHref } from '@/utils/propertyRouting';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tnpropertymandi.in';

export const getPropertyPublicUrl = (property) => `${SITE_URL}${getPropertyHref(property)}`;

export const downloadPropertyQr = async (property) => {
  const url = getPropertyPublicUrl(property);
  const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `QR_${property.formatted_id || property.property_id}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
