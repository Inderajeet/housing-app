import { normalizeCategory, normalizeMode } from '../../../utils/propertyRouting';
import { formatPrice, getAreaLabel, titleCaseSlug } from '../../../utils/seo';
import { getPropertyMeta } from '../../../lib/services/property.meta.service';
import ProjectDetailsView from '../../../components/ProjectDetailsView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tnpropertymandi.in';
const DEFAULT_IMAGE = `${SITE_URL}/default-home.jpg`;

function buildPropertyMeta(property) {
  const isRent = !!property.rent_amount;

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

  const title = `${typeLabel} for ${isRent ? 'Rent' : 'Sale'} in ${locationLabel} | TN Property Mandi`;

  const price = formatPrice(isRent ? property.rent_amount : property.sale_price, isRent);
  const area = getAreaLabel(property);
  const descParts = [`${typeLabel} for ${isRent ? 'Rent' : 'Sale'} in ${locationLabel}.`];
  if (price) descParts.push(isRent ? `Rent: ${price}.` : `Price: ${price}.`);
  if (area) descParts.push(`Area: ${area}.`);
  descParts.push('View details and photos on TN Property Mandi.');
  const description = descParts.join(' ');

  const imageUrl = property.primary_image || DEFAULT_IMAGE;

  return { title, description, imageUrl, locationLabel, lat: property.latitude, lng: property.longitude, districtName: property.district_name };
}

export async function generateMetadata({ params }) {
  const { slug = [] } = await params;
  const identifier = slug[slug.length - 1] || '';

  try {
    const property = await getPropertyMeta(identifier);
    if (!property) {
      return { title: 'Property | TN Property Mandi' };
    }

    const { title, description, imageUrl, lat, lng, districtName } = buildPropertyMeta(property);

    const isRent = !!property.rent_amount;
    const saleType = isRent
      ? ((property.property_use || '').toLowerCase() === 'commercial' ? 'Commercial' : property.bhk ? `${property.bhk} BHK` : 'Residential')
      : (property.sale_type ? property.sale_type.charAt(0).toUpperCase() + property.sale_type.slice(1) : 'Property');

    // Build composite OG image URL (all data as params — no DB call in the route)
    const ogp = new URLSearchParams();
    if (imageUrl && imageUrl !== DEFAULT_IMAGE) ogp.set('img', imageUrl);
    ogp.set('loc', property.village_name || property.taluk_name || property.district_name || '');
    ogp.set('layout', property.layout_name || property.title || property.street_name_or_road_name || '');
    ogp.set('info', [property.formatted_id, saleType].filter(Boolean).join(' / '));
    if (!isRent) {
      ogp.set('legal', property.legal_value || '-');
      ogp.set('speed', property.area_sales_speed != null ? `${Number(property.area_sales_speed).toFixed(1)}/M` : '-');
    }
    ogp.set('amenities', property.amenities_rating != null ? `${Number(property.amenities_rating).toFixed(1)}/10` : '-');
    ogp.set('locscore', property.utilities_rating != null ? `${Number(property.utilities_rating).toFixed(1)}/10` : '-');
    if (isRent) ogp.set('rent', '1');
    const ogImageUrl = `${SITE_URL}/api/og/property?${ogp.toString()}`;

    // Rich description with ratings
    const ratingParts = [];
    if (!isRent && property.legal_value) ratingParts.push(`Legal: ${property.legal_value}`);
    if (!isRent && property.area_sales_speed != null) ratingParts.push(`Speed: ${Number(property.area_sales_speed).toFixed(1)}/M`);
    if (property.amenities_rating != null) ratingParts.push(`Amenities: ${Number(property.amenities_rating).toFixed(1)}/10`);
    if (property.utilities_rating != null) ratingParts.push(`Location: ${Number(property.utilities_rating).toFixed(1)}/10`);
    const richDesc = ratingParts.length
      ? `${property.formatted_id} | ${ratingParts.join(' | ')}. ${description}`
      : description;

    return {
      title,
      description: richDesc,
      openGraph: {
        title,
        description: richDesc,
        siteName: 'TN Property Mandi',
        // width/height here tells Next.js to emit og:image:width and og:image:height
        images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
        locale: 'en_IN',
        type: 'website',
        url: `${SITE_URL}/property/${slug.join('/')}`,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: richDesc,
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
    console.error('[generateMetadata] error:', identifier, err?.message);
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
