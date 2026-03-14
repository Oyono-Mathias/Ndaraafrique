'use client';

/**
 * @fileOverview Section d'introduction à la Bourse du Savoir pour la Landing Page.
 * Présente le concept de propriété d'actifs numériques aux visiteurs.
 */

import { TrendingUp, BadgeEuro, Landmark, ArrowRight, LineChart, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

export function BourseIntroSection() {
  const locale = useLocale();

  return (
    <section className="px-6 mb-20 max-w-4xl mx-auto">
        <div className="bg-white/5 border border-primary/20 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl group transition-all hover:border-primary/40">
            {/* Ambient Background effects */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30" />
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                <div className="flex-1 space-y-6 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-top-4 duration-700">
                        <TrendingUp className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">Actifs de Nouvelle Génération</span>
                    </div>
                    
                    <h2 className="text-3xl md:text-4xl font-black text-white leading-tight uppercase tracking-tight">
                        La Bourse du <br/><span className="text-primary">Savoir.</span>
                    </h2>
                    
                    <p className="text-slate-400 text-sm leading-relaxed font-medium italic max-w-sm mx-auto md:mx-0">
                        "Ne vous contentez pas d'apprendre. Devenez propriétaire de formations d'élite et percevez des revenus à vie."
                    </p>

                    <div className="grid gap-4 py-2">
                        <BenefitItem icon={BadgeEuro} text="Acquérez des licences de revente." />
                        <BenefitItem icon={Landmark} text="Encaissez 100% des inscriptions futures." />
                        <BenefitItem icon={LineChart} text="Revendez vos actifs avec profit." />
                    </div>

                    <Button asChild className="w-full md:w-auto h-16 px-10 rounded-[2rem] bg-primary hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 group transition-all active:scale-95">
                        <Link href={`/${locale}/bourse`} className="flex items-center gap-3">
                            Explorer le Marché
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </Button>
                </div>

                {/* Fintech Active Card Visual */}
                <div className="w-full md:w-72 aspect-[4/5] relative animate-float">
                    <div className="absolute inset-0 bg-primary/10 rounded-[2.5rem] blur-2xl opacity-50" />
                    <div className="relative h-full w-full rounded-[2.5rem] border border-white/10 bg-[#1e293b]/80 backdrop-blur-xl p-6 flex flex-col justify-between shadow-2xl overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Landmark size={80} />
                        </div>
                        
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                                <TrendingUp size={24} />
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Projection ROI</p>
                                <p className="text-sm font-black text-emerald-500">+24.8%</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Cote Actuelle</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-white">150,000</span>
                                <span className="text-xs font-bold text-primary">XOF</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="h-[2px] w-full bg-white/5 overflow-hidden">
                                <div className="h-full bg-primary w-2/3 shadow-[0_0_10px_#10b981]" />
                            </div>
                            <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                <ShieldCheck size={10} className="text-primary" />
                                Transfert de titre sécurisé
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
  );
}

function BenefitItem({ icon: Icon, text }: { icon: any, text: string }) {
    return (
        <div className="flex items-center gap-4 group/item">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 group-hover/item:text-primary group-hover/item:border-primary/20 transition-all shadow-inner">
                <Icon size={16} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/item:text-white transition-colors">{text}</p>
        </div>
    );
}
