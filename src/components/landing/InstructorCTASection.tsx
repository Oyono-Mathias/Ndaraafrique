'use client';

/**
 * @fileOverview Section CTA pour les formateurs, optimisée pour mobile.
 */

import { Button } from '@/components/ui/button';
import { ArrowRight, GraduationCap, CheckCircle2, Coins } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export function InstructorCTASection() {
  const locale = useLocale();

  return (
    <section className="py-16 md:py-32 px-0">
        <div className="max-w-5xl mx-auto">
            <div className="glassmorphism rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-20 text-center relative overflow-hidden group mx-4 md:mx-0">
                {/* Background Animation */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-primary-600/5 to-ochre-DEFAULT/10 group-hover:opacity-100 transition-opacity duration-1000 opacity-50" />
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
                
                <div className="relative z-10 space-y-8 md:space-y-10">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-[1.5rem] md:rounded-[2rem] bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mx-auto shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                        <GraduationCap className="h-8 w-8 md:h-10 md:w-10 text-white" />
                    </div>
                    
                    <div className="space-y-4">
                        <h2 className="text-3xl sm:text-6xl font-black uppercase tracking-tight leading-[1.1]">
                            <span className="text-white block">Devenez un pilier du </span>
                            <span className="gradient-text block mt-2">savoir africain</span>
                        </h2>
                        
                        <p className="text-sm md:text-xl text-gray-400 max-w-2xl mx-auto font-medium italic leading-relaxed">
                            Partagez votre expertise avec des milliers d'apprenants motivés. 
                            Rejoignez notre communauté de formateurs d'excellence et monétisez votre savoir.
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Button asChild size="lg" className="h-14 md:h-16 px-10 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-500 active:scale-95 group">
                            <Link href={`/${locale}/devenir-instructeur`}>
                                Devenir Formateur
                                <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />
                            </Link>
                        </Button>
                        <Button variant="outline" size="lg" asChild className="h-14 md:h-16 px-10 rounded-2xl border-white/10 text-gray-300 hover:bg-white/5 hover:text-white font-bold uppercase text-[9px] md:text-[10px] tracking-widest transition-all active:scale-95">
                            <Link href={`/${locale}/about`}>En savoir plus</Link>
                        </Button>
                    </div>
                    
                    {/* Feature Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 md:gap-8 pt-8 md:pt-12 border-t border-white/5 mt-8 md:mt-12">
                        <div className="space-y-1">
                            <div className="flex items-center justify-center gap-1.5 md:gap-2 text-primary">
                                <CheckCircle2 size={12} className="md:size-3.5" />
                                <span className="text-lg md:text-2xl font-black text-white">50+</span>
                            </div>
                            <p className="text-[7px] md:text-[9px] font-black uppercase text-slate-500 tracking-widest">Formateurs</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-center gap-1.5 md:gap-2 text-primary">
                                <CheckCircle2 size={12} className="md:size-3.5" />
                                <span className="text-lg md:text-2xl font-black text-white">10k+</span>
                            </div>
                            <p className="text-[7px] md:text-[9px] font-black uppercase text-slate-500 tracking-widest">Étudiants</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-center gap-1.5 md:gap-2 text-emerald-500">
                                <Coins size={12} className="md:size-3.5" />
                                <span className="text-lg md:text-2xl font-black text-white">500k+</span>
                            </div>
                            <p className="text-[7px] md:text-[9px] font-black uppercase text-slate-500 tracking-widest">FCFA/mois</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
  );
}
