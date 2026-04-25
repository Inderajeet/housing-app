import { Suspense } from 'react';
import SearchPageClient from './SearchPageClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SearchPageClient />
    </Suspense>
  );
}

