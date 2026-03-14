'use client';

/**
 * @fileOverview CTA pour les experts - Piloté par les réglages Admin.
 */

import { useMemo } from 'react';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { getFirestore, doc } from 'firebase/firestore';
import { useDoc } from '@/firebase';
import type { Settings } from '@/lib/types';

export function InstructorCTASection() {
  const locale = useLocale();
  const db = getFirestore();
  const settingsRef = useMemo(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings } = useDoc<Settings>(settingsRef);

  const content = settings?.content?.landingPage;

  if (content?.showFinalCta === false) return null;

  return (
    <section className="px-6 mb-20 max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-ndara-ochre to-[#9a5a1a] rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(204,119,34,0.3)] relative overflow-hidden group active:scale-[0.98] transition-all">
            {/* Ambient effects */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-[60px] -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-1000" />
            
            <div className="relative z-10 space-y-8">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3 group-hover:rotate-0 transition-transform">
                    <GraduationCap className="h-8 w-8" />
                </div>
                
                <div className="space-y-3">
                    <h2 className="font-black text-3xl text-white uppercase tracking-tight leading-none">
                        {content?.finalCtaTitle || "Rejoignez l'Élite des Formateurs"}
                    </h2>
                    <p className="text-white/80 text-xs md:text-sm font-medium italic leading-relaxed max-w-xs">
                        {content?.finalCtaSubtitle || "Monétisez votre savoir et formez la prochaine génération de leaders africains."}
                    </p>
                </div>

                <Button asChild className="w-full h-16 rounded-[2rem] bg-white hover:bg-slate-100 text-[#9a5a1a] font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all">
                    <Link href={`/${locale}/devenir-instructeur`} className="flex items-center gap-2">
                        {content?.finalCtaButtonText || "Devenir Instructeur"}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </div>
    </section>
  );
}
