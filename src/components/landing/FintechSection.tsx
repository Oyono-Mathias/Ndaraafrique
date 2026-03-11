'use client';

/**
 * @fileOverview Section Fintech optimisée pour l'affichage mobile.
 */

import { ShieldCheck, Smartphone, Zap, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from "@/lib/utils";

const paymentMethods = [
    { name: 'Orange Money', color: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/50' },
    { name: 'MTN MoMo', color: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/50' },
    { name: 'Wave', color: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/50' },
];

export function FintechSection() {
  const locale = useLocale();
  const fintechImage = PlaceHolderImages.find(img => img.id === 'qwen-fintech-momo')?.imageUrl || '';

  return (
    <section className="py-16 md:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-900 to-primary/5 rounded-[3rem] md:rounded-[4rem] border border-white/5 mx-0 md:mx-4">
        <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
                {/* Content */}
                <div className="space-y-8 md:space-y-10 text-center lg:text-left animate-in fade-in slide-in-from-left-8 duration-1000">
                    <div className="space-y-4">
                        <h2 className="text-3xl sm:text-6xl font-black uppercase tracking-tight leading-tight">
                            <span className="text-white block">La Liberté de </span>
                            <span className="gradient-text block mt-2">Paiement</span>
                        </h2>
                        <p className="text-sm md:text-xl text-gray-400 leading-relaxed font-medium italic mx-auto lg:mx-0 max-w-lg">
                            Zéro barrière. Payez avec votre téléphone, apprenez instantanément. 
                            Notre plateforme intègre tous les moyens de paiement mobile populaires en Afrique.
                        </p>
                    </div>
                    
                    {/* Payment Methods Badges */}
                    <div className="flex flex-wrap justify-center lg:justify-start gap-3 md:gap-4">
                        {paymentMethods.map((method) => (
                            <div key={method.name} className={cn(
                                "px-4 py-2 md:px-6 md:py-3 rounded-2xl bg-white/5 border flex items-center space-x-2 md:space-x-3 backdrop-blur-md shadow-xl transition-transform active:scale-95",
                                method.border
                            )}>
                                <div className={cn("w-2 h-2 md:w-3 md:h-3 rounded-full animate-pulse", method.color)} />
                                <span className={cn("font-black uppercase text-[8px] md:text-[10px] tracking-widest", method.text)}>
                                    {method.name}
                                </span>
                            </div>
                        ))}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 pt-4">
                        <Button asChild size="lg" className="w-full sm:w-auto h-14 md:h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 group transition-all active:scale-95">
                            <Link href={`/${locale}/search`}>
                                Explorer les cours
                                <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />
                            </Link>
                        </Button>
                        <div className="flex flex-col items-center lg:items-start">
                            <div className="flex items-center gap-2 text-emerald-500 font-bold uppercase text-[9px] md:text-[10px] tracking-tighter">
                                <ShieldCheck size={14} />
                                100% Sécurisé
                            </div>
                            <p className="text-[8px] md:text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Audit financier Ndara</p>
                        </div>
                    </div>
                </div>
                
                {/* Visual */}
                <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 px-4">
                    <div className="relative z-10 max-w-xs md:max-w-md mx-auto">
                        <div className="absolute inset-0 bg-primary/20 blur-[60px] md:blur-[100px] rounded-full -z-10" />
                        <Image 
                            src={fintechImage} 
                            alt="Transaction Ndara Mobile Money" 
                            width={500}
                            height={800}
                            className="w-full rounded-[2.5rem] md:rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/10"
                            data-ai-hint="mobile payment"
                        />
                    </div>
                    
                    {/* Floating Info Cards */}
                    <div className="absolute top-1/4 -right-4 sm:-right-8 bg-slate-900/90 backdrop-blur-xl p-4 md:p-5 rounded-3xl border border-white/10 shadow-2xl z-20 animate-float hidden sm:block">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 md:h-10 md:w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500">
                                <Zap size={18} />
                            </div>
                            <p className="text-[8px] md:text-[10px] font-black text-white uppercase tracking-widest">Accès<br/>Instantané</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
  );
}
