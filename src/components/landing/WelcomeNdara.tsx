'use client';

/**
 * @fileOverview Section d'annonce "L'Ère des Ndara" pour la Landing Page.
 * Présente l'arsenal technologique et les bénéfices pour l'utilisateur.
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { 
    Bot, 
    Wallet, 
    TrendingUp, 
    BookOpen, 
    Users, 
    ShieldCheck, 
    Sparkles, 
    Zap,
    Trophy,
    Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

const FeatureItem = ({ icon: Icon, title, desc, color }: any) => (
    <div className="flex gap-4 p-6 bg-white/5 border border-white/5 rounded-[2rem] hover:border-primary/30 transition-all group">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform", color)}>
            <Icon size={24} />
        </div>
        <div>
            <h4 className="font-black text-white text-sm uppercase tracking-tight mb-1">{title}</h4>
            <p className="text-slate-400 text-xs leading-relaxed font-medium">{desc}</p>
        </div>
    </div>
);

const BenefitCard = ({ icon: Icon, title, desc, color }: any) => (
    <div className="bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] text-center space-y-4 shadow-2xl relative overflow-hidden group active:scale-[0.98] transition-all">
        <div className={cn("absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10", color)} />
        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-inner mb-2", color.replace('bg-', 'bg-opacity-20 bg-'))}>
            <Icon size={32} className={color.replace('bg-', 'text-')} />
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">{title}</h3>
        <p className="text-slate-500 text-xs font-medium italic leading-relaxed">"{desc}"</p>
    </div>
);

export function WelcomeNdara() {
  const t = useTranslations('Landing.welcome_ndara');

  return (
    <section className="py-24 px-6 relative overflow-hidden">
        {/* Background Visuals */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto space-y-20 relative z-10">
            {/* Header */}
            <div className="text-center space-y-6 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-top-4 duration-700">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{t('badge')}</span>
                </div>
                <h2 
                    className="text-4xl md:text-6xl font-black text-white leading-tight uppercase tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-1000"
                    dangerouslySetInnerHTML={{ __html: t('title') }}
                />
                <p className="text-slate-400 text-lg md:text-xl font-medium italic leading-relaxed">
                    "{t('description')}"
                </p>
            </div>

            {/* Features Grid */}
            <div className="space-y-8">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] text-center flex items-center justify-center gap-3">
                    <div className="h-px bg-white/5 flex-1" />
                    {t('features_title')}
                    <div className="h-px bg-white/5 flex-1" />
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FeatureItem icon={Bot} title={t('f1_title')} desc={t('f1_desc')} color="text-primary bg-primary/10" />
                    <FeatureItem icon={Wallet} title={t('f2_title')} desc={t('f2_desc')} color="text-blue-400 bg-blue-500/10" />
                    <FeatureItem icon={TrendingUp} title={t('f3_title')} desc={t('f3_desc')} color="text-amber-500 bg-amber-500/10" />
                    <FeatureItem icon={Users} title={t('f4_title')} desc={t('f4_desc')} color="text-purple-400 bg-purple-500/10" />
                    <FeatureItem icon={BookOpen} title="Catalogue Élite" desc="Formations exclusives en FinTech et AgriTech." color="text-emerald-400 bg-emerald-500/10" />
                    <FeatureItem icon={Award} title="Certificats QR" desc="Diplômes numériques infalsifiables en HD." color="text-red-400 bg-red-500/10" />
                </div>
            </div>

            {/* Benefits Row */}
            <div className="space-y-8">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] text-center flex items-center justify-center gap-3">
                    <div className="h-px bg-white/5 flex-1" />
                    {t('benefits_title')}
                    <div className="h-px bg-white/5 flex-1" />
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <BenefitCard icon={Zap} title={t('b1_title')} desc={t('b1_desc')} color="bg-emerald-500" />
                    <BenefitCard icon={Trophy} title={t('b2_title')} desc={t('b2_desc')} color="bg-primary" />
                    <BenefitCard icon={ShieldCheck} title={t('b3_title')} desc={t('b3_desc')} color="bg-blue-500" />
                </div>
            </div>

            {/* Final Touch */}
            <div className="pt-12 text-center">
                <p className="text-[9px] font-black text-slate-800 uppercase tracking-[0.6em]">Bara ala, Tonga na ndara.</p>
            </div>
        </div>
    </section>
  );
}
