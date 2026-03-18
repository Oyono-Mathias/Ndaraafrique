
'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Pont de redirection pour la route /profile.
 * Redirige vers la page de profil étudiant pour assurer une UX cohérente et éviter les 404.
 */
export default function ProfileRedirect() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string || 'fr';

  useEffect(() => {
    router.replace(`/${locale}/student/profile`);
  }, [locale, router]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-sans">
      <div className="relative">
        <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-6 relative z-10" />
      </div>
      <h1 className="text-sm font-black uppercase tracking-[0.4em] text-white/80 animate-pulse">
        Chargement du profil...
      </h1>
    </div>
  );
}
