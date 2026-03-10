'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Pont de redirection Checkout (Ancienne route).
 * Harmonise le routage en redirigeant vers la structure unifiée [slug].
 */
export default function CheckoutRedirect() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const locale = params.locale as string;

  useEffect(() => {
    if (slug && locale) {
      router.replace(`/${locale}/student/checkout/${slug}`);
    }
  }, [slug, locale, router]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-sans">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
        Chargement du tunnel sécurisé...
      </p>
    </div>
  );
}
