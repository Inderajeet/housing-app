import { Suspense } from 'react';
import LandingPageClient from './LandingPageClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LandingPageClient />
    </Suspense>
  );
}
