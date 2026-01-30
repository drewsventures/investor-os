'use client';

// Redirect to existing fund page for now
// TODO: Move fund page content here in future refactor

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PortfolioPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/fund');
  }, [router]);

  return (
    <div className="p-8 flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Redirecting to portfolio...</div>
    </div>
  );
}
