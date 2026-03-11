'use client';

import { ShieldCheck, Smartphone, Zap, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useLocale } from 'next-intl';
import Link from 'next/link';

const paymentMethods = [
    { name: 'Orange Money', color: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/50' },
    { name: 'MTN MoMo', color: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/50' },
    { name: 'Wave', color: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/50' },
];

export function FintechSection() {
  const locale = useLocale();

  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-900 to-primary/5 rounded-[4rem] border border-white/5 mx-4">
        <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                {/* Content */}
                <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-1000">
                    <div className="space-y-4">
                        <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight leading-tight">
                            <span className="text-white block">La Liberté de </span>
                            <span className="gradient-text block mt-2">Paiement</span>
                        </h2>
                        <p className="text-xl text-gray-400 leading-relaxed font-medium italic">
                            Zéro barrière. Payez avec votre téléphone, apprenez instantanément. 
                            Notre plateforme intègre tous les moyens de paiement mobile populaires en Afrique.
                        </p>
                    </div>
                    
                    {/* Payment Methods Badges */}
                    <div className="flex flex-wrap gap-4">
                        {paymentMethods.map((method) => (
                            <div key={method.name} className={cn(
                                "px-6 py-3 rounded-2xl bg-white/5 border flex items-center space-x-3 backdrop-blur-md shadow-xl transition-transform hover:scale-105",
                                method.border
                            )}>
                                <div className={cn("w-3 h-3 rounded-full animate-pulse", method.color)} />
                                <span className={cn("font-black uppercase text-[10px] tracking-widest", method.text)}>
                                    {method.name}
                                </span>
                            </div>
                        ))}
                    </div>
                    
                    <div className="flex items-center gap-6 pt-4">
                        <Button asChild size="lg" className="h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 group">
                            <Link href={`/${locale}/search`}>
                                Découvrir le catalogue
                                <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />
                            </Link>
                        </Button>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-emerald-500 font-bold uppercase text-[10px] tracking-tighter">
                                <ShieldCheck size={14} />
                                100% Sécurisé
                            </div>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Audit financier Ndara</p>
                        </div>
                    </div>
                </div>
                
                {/* Visual */}
                <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
                    <div className="relative z-10 max-w-md mx-auto">
                        <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full -z-10" />
                        <Image 
                            src="https://image.qwenlm.ai/public_source/a41cae04-256c-40f4-9811-70794f88de4b/17796c6b0-aa50-449e-a64c-d39ca953a6aa.png" 
                            alt="Transaction Ndara Mobile Money" 
                            width={500}
                            height={800}
                            className="w-full rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.6)] border border-white/10"
                            data-ai-hint="mobile money payment"
                        />
                    </div>
                    
                    {/* Floating Info Cards */}
                    <div className="absolute top-1/4 -right-8 sm:-right-12 bg-slate-900/90 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-2xl z-20 animate-float">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500">
                                <Zap size={20} />
                            </div>
                            <p className="text-[10px] font-black text-white uppercase tracking-widest">Accès<br/>Instantané</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
  );
}

import { cn } from "@/lib/utils";
