'use client';

/**
 * @fileOverview Hero Section Ndara Afrique V3 - Piloté par les réglages Admin.
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { getFirestore, doc } from 'firebase/firestore';
import { useDoc } from '@/firebase';
import type { Settings } from '@/lib/types';

export function Hero() {
  const locale = useLocale();
  const db = getFirestore();
  const settingsRef = useMemo(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings } = useDoc<Settings>(settingsRef);

  const content = settings?.content?.landingPage;

  return (
    <section className="relative pt-32 pb-16 px-6 overflow-hidden bg-[#0f172a]">
        {/* Background Glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-ndara-ochre/10 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#10b981]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">
                    {settings?.general?.siteName || "Ndara Afrique"} #1 en Afrique
                </span>
            </div>
            
            <h1 
                className="font-black text-5xl sm:text-7xl leading-[1.1] text-white mb-8 uppercase tracking-tighter animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100"
                dangerouslySetInnerHTML={{ __html: content?.heroTitle || "APPRENEZ.<br />RÉUSSISSEZ.<br />INSPIREZ." }}
            />
            
            <p className="text-gray-400 text-sm md:text-lg mb-10 max-w-xs md:max-w-md mx-auto leading-relaxed font-medium italic animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                "{content?.heroSubtitle || "De l'Agritech à la Fintech, accédez aux compétences de demain avec les meilleurs experts du continent."}"
            </p>

            {content?.showHeroCta !== false && (
                <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
                    <Button asChild size="lg" className="w-full md:w-auto h-16 px-10 rounded-[2.5rem] bg-primary hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/20 active:scale-95 transition-all animate-pulse-glow group">
                        <Link href={`/${locale}/search`} className="flex items-center gap-3">
                            {content?.heroCtaText || "Commencer l'Aventure"}
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </Button>
                </div>
            )}
        </div>

        {/* Hero Image Immersive */}
        <div className="mt-16 relative max-w-lg mx-auto animate-in fade-in zoom-in duration-1000 delay-500">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent z-10" />
            <div className="relative aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
                <Image 
                    src={content?.heroImageUrl || "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"} 
                    alt="Hero Image" 
                    fill 
                    className="object-cover animate-float"
                    priority
                />
            </div>
            
            {/* Floating Badge */}
            <div className="absolute -bottom-4 -right-4 md:right-4 bg-slate-900/90 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl z-20 flex items-center gap-3 animate-float" style={{ animationDelay: '1s' }}>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Sparkles className="h-5 w-5" />
                </div>
                <div className="text-left">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Savoir</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Certifié Ndara</p>
                </div>
            </div>
        </div>
    </section>
  );
}
