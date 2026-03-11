'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function Hero() {
  const locale = useLocale();
  const heroImage = PlaceHolderImages.find(img => img.id === 'qwen-hero-student')?.imageUrl || '';

  return (
    <section className="pt-24 pb-16 md:pt-32 md:pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Cercles de lueur décoratifs */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-primary/5 blur-[80px] md:blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] md:w-[300px] md:h-[300px] bg-blue-500/5 blur-[60px] md:blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                {/* Text Content */}
                <div className="space-y-8 md:space-y-10 text-center lg:text-left animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary-400 mx-auto lg:mx-0">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em]">L'Éveil du Savoir</span>
                        </div>
                        <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black leading-[1] tracking-tighter uppercase">
                            <span className="text-white block">L'Éveil du</span>
                            <span className="gradient-text block mt-2">Savoir Africain</span>
                        </h1>
                    </div>
                    
                    <p className="text-base md:text-xl text-gray-400 leading-relaxed max-w-lg mx-auto lg:mx-0 font-medium italic">
                        Découvrez une plateforme éducative révolutionnaire où le savoir ancestral rencontre la technologie moderne. Apprenez, grandissez et transformez votre avenir avec Ndara.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                        <Button asChild size="lg" className="h-14 md:h-16 px-10 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-black uppercase text-xs tracking-[0.2em] group transition-all duration-500 shadow-xl shadow-primary/20 active:scale-95">
                            <Link href={`/${locale}/login?tab=register`}>
                                <span>Commencer Maintenant</span>
                                <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />
                            </Link>
                        </Button>
                        <Button variant="ghost" size="lg" asChild className="h-14 md:h-16 px-10 rounded-full border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-all duration-300 gap-3 font-bold uppercase text-[10px] tracking-widest active:scale-95">
                            <Link href={`/${locale}/about`}>
                                <PlayCircle className="h-6 w-6 text-primary" />
                                <span>La vision</span>
                            </Link>
                        </Button>
                    </div>
                </div>
                
                {/* Visual Content */}
                <div className="relative animate-in fade-in zoom-in duration-1000 delay-300 px-4 sm:px-0">
                    <div className="vintage-border p-2 md:p-3 bg-slate-900/50 backdrop-blur-sm relative z-10">
                        <div className="relative aspect-square w-full rounded-lg overflow-hidden shadow-2xl">
                            <Image 
                                src={heroImage} 
                                alt="Étudiant Africain Ndara" 
                                fill
                                className="object-cover transition-transform duration-1000 hover:scale-110"
                                data-ai-hint="african student"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
                        </div>
                    </div>
                    
                    {/* Floating Decorative Badge */}
                    <div className="absolute -bottom-4 -right-2 md:-bottom-6 md:-right-6 bg-slate-900 border border-white/10 p-4 md:p-6 rounded-3xl shadow-2xl z-20 animate-bounce transition-all duration-1000" style={{ animationDuration: '4s' }}>
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="h-10 w-10 md:h-12 md:w-12 bg-primary/20 rounded-2xl flex items-center justify-center">
                                <ArrowRight className="h-5 w-5 md:h-6 md:w-6 text-primary -rotate-45" />
                            </div>
                            <div>
                                <p className="text-lg md:text-xl font-black text-white leading-none">100%</p>
                                <p className="text-[7px] md:text-[8px] font-black uppercase text-slate-500 tracking-widest mt-1">Impact Local</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
  );
}
