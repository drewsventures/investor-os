'use client';

// Redirect to existing deals page
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RBVDealsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/deals');
  }, [router]);

  return (
    <div className="p-8 flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Redirecting to deal pipeline...</div>
    </div>
  );
}
