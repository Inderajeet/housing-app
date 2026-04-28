import { Suspense } from 'react';
import SearchPageClient from './SearchPageClient';
import { normalizeMode, normalizeCategory } from '../../utils/propertyRouting';
import { getCategoryLabel, titleCaseSlug } from '../../utils/seo';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tnpropertymandi.in';

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;

  const mode = normalizeMode(sp.type || 'rent');
  const category = normalizeCategory(sp.category) || '';
  const districtSlug = sp.district || '';
  const talukSlug = sp.taluk || '';
  const villageSlug = sp.village || '';

  const modeLabel = mode === 'sale' ? 'Sale' : 'Rent';
  const typeLabel = getCategoryLabel(mode, category);

  // Build location label from URL name slugs (already human-readable after titleCaseSlug)
  const locationParts = [
    villageSlug ? titleCaseSlug(villageSlug) : '',
    talukSlug ? titleCaseSlug(talukSlug) : '',
    districtSlug ? titleCaseSlug(districtSlug) : '',
  ].filter(Boolean);
  const locationLabel = locationParts.length > 0 ? locationParts.join(', ') : 'Tamil Nadu';

  const title = `${typeLabel} for ${modeLabel} in ${locationLabel} | TN Property Mandi`;
  const description = `Find verified ${typeLabel} properties for ${modeLabel.toLowerCase()} in ${locationLabel}. Browse the latest listings with photos and pricing on TN Property Mandi.`;

  const canonicalParams = new URLSearchParams();
  canonicalParams.set('type', mode);
  if (category) canonicalParams.set('category', category);
  if (districtSlug) canonicalParams.set('district', districtSlug);
  if (talukSlug) canonicalParams.set('taluk', talukSlug);
  if (villageSlug) canonicalParams.set('village', villageSlug);
  const canonicalUrl = `${SITE_URL}/search?${canonicalParams.toString()}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'TN Property Mandi',
      locale: 'en_IN',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    other: {
      'geo.region': 'IN-TN',
      ...(districtSlug ? { 'geo.placename': titleCaseSlug(districtSlug) } : {}),
    },
  };
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SearchPageClient />
    </Suspense>
  );
}
