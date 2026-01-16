import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SubscriptionSuccessClient from './subscription-success-client';

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <SubscriptionSuccessClient />
    </Suspense>
  )
}
