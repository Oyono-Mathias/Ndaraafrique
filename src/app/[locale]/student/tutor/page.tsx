'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// ✅ On importe le composant de manière dynamique et on désactive le SSR (Server Side Rendering)
const TutorClient = dynamic(() => import('./TutorClient'), { 
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
});

export default function TutorPage() {
  return <TutorClient />;
}
