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

  // Rich description with ratings for WhatsApp/social (used in buildRichDescription)
  const ratingParts = [];
  if (!isRent && property.legal_value) ratingParts.push(`Legal: ${property.legal_value}`);
  if (!isRent && property.area_sales_speed != null) ratingParts.push(`Sales Speed: ${Number(property.area_sales_speed).toFixed(1)}/M`);
  if (property.amenities_rating != null) ratingParts.push(`Amenities: ${Number(property.amenities_rating).toFixed(1)}/10`);
  if (property.utilities_rating != null) ratingParts.push(`Location: ${Number(property.utilities_rating).toFixed(1)}/10`);
  const richDescription = ratingParts.length
    ? `${descParts.slice(0, -1).join(' ')} ${ratingParts.join(' | ')}. View on TN Property Mandi.`
    : description;

  const imageUrl = property.primary_image || DEFAULT_IMAGE;

  return {
    title,
    description,
    richDescription,
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

    const { title, description, imageUrl, lat, lng, districtName, richDescription } = buildPropertyMeta(property);

    // Use the direct Cloudflare image URL — WhatsApp fetches it instantly without going through
    // our image generation route (which is too slow for WhatsApp's bot timeout).
    const ogImageUrl = (imageUrl && imageUrl !== DEFAULT_IMAGE) ? imageUrl : DEFAULT_IMAGE;

    return {
      title,
      description: richDescription || description,
      openGraph: {
        title,
        description: richDescription || description,
        siteName: 'TN Property Mandi',
        images: [{ url: ogImageUrl, alt: title }],
        locale: 'en_IN',
        type: 'website',
        url: `${SITE_URL}/property/${slug.join('/')}`,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: richDescription || description,
        images: [ogImageUrl],
      },
      other: {
        'og:image:secure_url': ogImageUrl,
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
