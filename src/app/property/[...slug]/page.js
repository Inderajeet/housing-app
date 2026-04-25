'use client';

import { useParams } from 'next/navigation';
import { normalizeCategory, normalizeMode } from '../../../utils/propertyRouting';
import ProjectDetailsView from '../../../components/ProjectDetailsView';

export default function ProjectDetailsPage() {
  const { slug = [] } = useParams();

  // /property/123  → slug = ['123']
  // /property/rent/residential/123 → slug = ['rent', 'residential', '123']
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
