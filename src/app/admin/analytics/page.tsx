
'use client';

import { useRouter } from 'next-intl/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AnalyticsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/statistiques');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
