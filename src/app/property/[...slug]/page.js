import { normalizeCategory, normalizeMode } from '../../../utils/propertyRouting';
import { formatPrice, getAreaLabel, titleCaseSlug } from '../../../utils/seo';
import { getPropertyMeta } from '../../../lib/services/property.meta.service';
import ProjectDetailsView from '../../../components/ProjectDetailsView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tnpropertymandi.in';
const DEFAULT_IMAGE = `${SITE_URL}/default-home.jpg`;

function buildPropertyMeta(property) {
  const isRent = !!property.rent_amount;
  const modeLabel = isRent ? 'Rent' : 'Sale';

  let typeLabel;
  if (isRent) {
    const use = String(property.property_use || '').toLowerCase();
    if (use === 'commercial') typeLabel = 'Commercial Property';
    else if (property.bhk) typeLabel = `${property.bhk} BHK`;
    else typeLabel = 'Property';
  } else {
    typeLabel = property.sale_type ? titleCaseSlug(property.sale_type) : 'Property';
  }

  const locationParts = [property.village_name, property.taluk_name, property.district_name].filter(Boolean);
  const locationLabel = locationParts.length > 0 ? locationParts.join(', ') : 'Tamil Nadu';

  const title = `${typeLabel} for ${modeLabel} in ${locationLabel} | TN Property Mandi`;

  const price = formatPrice(isRent ? property.rent_amount : property.sale_price, isRent);
  const area = getAreaLabel(property);
  const descParts = [`${typeLabel} for ${modeLabel} in ${locationLabel}.`];
  if (price) descParts.push(isRent ? `Rent: ${price}.` : `Price: ${price}.`);
  if (area) descParts.push(`Area: ${area}.`);
  descParts.push('View details and photos on TN Property Mandi.');
  const description = descParts.join(' ');

  const imageUrl = property.primary_image || DEFAULT_IMAGE;

  return {
    title,
    description,
    imageUrl,
    locationLabel,
    lat: property.latitude,
    lng: property.longitude,
    districtName: property.district_name,
  };
}

export async function generateMetadata({ params }) {
  const { slug = [] } = await params;
  const identifier = slug[slug.length - 1] || '';

  try {
    const property = await getPropertyMeta(identifier);
    if (!property) {
      console.warn('[generateMetadata] property not found for identifier:', identifier);
      return { title: 'Property | TN Property Mandi' };
    }

    const { title, description, imageUrl, lat, lng, districtName } = buildPropertyMeta(property);
    const ogImageUrl = `${SITE_URL}/api/og/property?id=${encodeURIComponent(identifier)}${imageUrl && imageUrl !== DEFAULT_IMAGE ? `&img=${encodeURIComponent(imageUrl)}` : ''}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: 'TN Property Mandi',
        images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
        locale: 'en_IN',
        type: 'website',
        url: `${SITE_URL}/property/${slug.join('/')}`,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
      },
      other: {
        'geo.region': 'IN-TN',
        ...(districtName ? { 'geo.placename': districtName } : {}),
        ...(lat && lng ? { 'geo.position': `${lat};${lng}`, ICBM: `${lat}, ${lng}` } : {}),
      },
    };
  } catch (err) {
    console.error('[generateMetadata] failed for identifier:', identifier, err?.message || err);
    return { title: 'Property | TN Property Mandi' };
  }
}

export default async function ProjectDetailsPage({ params }) {
  const { slug = [] } = await params;
  const identifier = slug[slug.length - 1] || '';
  const mode = slug.length >= 3 ? normalizeMode(slug[0]) : null;
  const category = slug.length >= 3 ? normalizeCategory(slug[1]) : null;

  return (
    <ProjectDetailsView
      routeIdentifier={identifier}
      routeMode={mode}
      routeCategory={category}
    />
  );
}
