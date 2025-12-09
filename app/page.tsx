'use client';

import dynamic from 'next/dynamic';

const EnhancedLandingPage = dynamic(() => import('./landing/page'), { ssr: false });

export default function Home() {
  return <EnhancedLandingPage />;
}
