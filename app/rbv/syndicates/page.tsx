'use client';

// Redirect to existing syndicate page
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SyndicatesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/syndicate');
  }, [router]);

  return (
    <div className="p-8 flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Redirecting to syndicates...</div>
    </div>
  );
}
