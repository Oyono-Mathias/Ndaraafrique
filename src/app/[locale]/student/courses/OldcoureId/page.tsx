'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Pont de redirection (Ancienne route).
 * Harmonise le routage en redirigeant vers la structure unifiée [slug].
 */
export default function StudentCourseRedirect() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const locale = params.locale as string;

  useEffect(() => {
    if (slug && locale) {
      router.replace(`/${locale}/courses/${slug}`);
    }
  }, [slug, locale, router]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-sans">
      <div className="relative">
        <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-6 relative z-10" />
      </div>
      <h1 className="text-sm font-black uppercase tracking-[0.4em] text-white/80 animate-pulse">
        Synchronisation Ndara...
      </h1>
    </div>
  );
}
