
'use client';

/**
 * @fileOverview Section 'Liberté de Paiement' Ndara Afrique.
 * ✅ I18N : Traduction des textes fintech.
 */

import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function FintechSection() {
  const t = useTranslations('Landing.fintech');

  return (
    <section className="px-6 mb-20 max-w-4xl mx-auto">
        <div className="bg-white/5 rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-ndara-ochre/15 rounded-full blur-[60px] -mr-20 -mt-20" />
            
            <div className="relative z-10 text-center mb-10 space-y-2">
                <h2 className="font-black text-2xl text-white uppercase tracking-tight">{t('title')}</h2>
                <p className="text-slate-500 text-xs font-medium italic">"{t('subtitle')}"</p>
            </div>

            <div className="flex justify-center items-center gap-5 mb-10 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-[#FF7900] flex items-center justify-center text-white font-black text-sm shadow-2xl shadow-[#FF7900]/20 active:scale-90 transition-transform">OM</div>
                <div className="w-16 h-16 rounded-2xl bg-[#FFCC00] flex items-center justify-center text-black font-black text-sm shadow-2xl shadow-[#FFCC00]/20 active:scale-90 transition-transform">MTN</div>
                <div className="w-16 h-16 rounded-2xl bg-[#1DC0F1] flex items-center justify-center text-white font-black text-sm shadow-2xl shadow-[#1DC0F1]/20 active:scale-90 transition-transform">W</div>
            </div>

            <div className="bg-black/40 backdrop-blur-md rounded-3xl p-5 flex items-center justify-between border border-white/5 relative z-10 animate-in fade-in zoom-in duration-1000">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-white text-[11px] font-black uppercase tracking-widest">{t('secure_title')}</p>
                        <p className="text-slate-600 text-[9px] font-bold uppercase mt-0.5">{t('secure_desc')}</p>
                    </div>
                </div>
                <CheckCircle2 className="text-emerald-500 h-5 w-5" />
            </div>
        </div>
    </section>
  );
}
