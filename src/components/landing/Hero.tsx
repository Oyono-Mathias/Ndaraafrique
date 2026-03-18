
'use client';

/**
 * @fileOverview Hero Section Ndara Afrique V4 - Intégration de la barre de recherche.
 * ✅ I18N : Traduction complète des textes par défaut.
 */

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Search } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { getFirestore, doc } from 'firebase/firestore';
import { useDoc } from '@/firebase';
import type { Settings } from '@/lib/types';
import { Input } from '@/components/ui/input';

export function Hero() {
  const locale = useLocale();
  const t = useTranslations('Landing.hero');
  const router = useRouter();
  const db = getFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  
  const settingsRef = useMemo(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings } = useDoc<Settings>(settingsRef);

  const content = settings?.content?.landingPage;

  const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      router.push(`/${locale}/search?query=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <section className="relative pt-32 pb-16 px-6 overflow-hidden bg-[#0f172a]">
        {/* Background Glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-ndara-ochre/10 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#10b981]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">
                    {content?.heroBadge || t('badge')}
                </span>
            </div>
            
            <h1 
                className="font-black text-5xl sm:text-7xl leading-[1.1] text-white mb-8 uppercase tracking-tighter animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100"
                dangerouslySetInnerHTML={{ __html: content?.heroTitle || t('title') }}
            />
            
            <p className="text-gray-400 text-sm md:text-lg mb-10 max-w-xs md:max-w-xl mx-auto leading-relaxed font-medium italic animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                "{content?.heroSubtitle || t('subtitle')}"
            </p>

            {/* Barre de Recherche Immersive */}
            <div className="max-w-2xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
                <form onSubmit={handleSearch} className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Search className="h-5 w-5 text-primary" />
                    </div>
                    <Input 
                        placeholder={t('search_placeholder')}
                        className="h-16 pl-16 pr-16 rounded-[2rem] bg-white/5 border-white/10 text-white shadow-2xl focus-visible:ring-primary/20 text-lg placeholder:text-slate-600"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-slate-950 active:scale-90 transition-transform">
                        <ArrowRight className="h-5 w-5" />
                    </button>
                </form>
            </div>

            <div className="flex flex-wrap justify-center gap-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-400">
                <Button asChild size="lg" className="h-14 px-10 rounded-2xl bg-primary hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all">
                    <Link href={`/${locale}/search`}>{t('cta_explore')}</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 rounded-2xl border-white/10 bg-white/5 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                    <Link href={`/${locale}/devenir-instructeur`}>{t('cta_instructor')}</Link>
                </Button>
            </div>
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
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">{t('badge_card_title')}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{t('badge_card_subtitle')}</p>
                </div>
            </div>
        </div>
    </section>
  );
}
