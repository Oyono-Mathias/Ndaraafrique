'use client';

/**
 * @fileOverview Navbar Ndara Afrique V3 - Design Glassmorphism.
 * ✅ INTERFACE : Tactile, épurée, respecte les safe-areas.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, X, ArrowRight, TrendingUp } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useLocale } from 'next-intl';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const locale = useLocale();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={cn(
        "fixed top-0 w-full z-[100] transition-all duration-500 h-20 flex items-center safe-area-pt",
        scrolled ? "bg-slate-950/80 backdrop-blur-xl border-b border-white/5 shadow-2xl" : "bg-transparent"
    )}>
        <div className="max-w-7xl mx-auto px-6 w-full">
            <div className="flex justify-between items-center">
                <Link href={`/${locale}`} className="flex items-center gap-2.5 group">
                    <div className="w-9 h-9 rounded-[0.75rem] bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">N</div>
                    <span className="font-black text-xl text-white tracking-tighter uppercase">Ndara</span>
                </Link>

                <div className="flex items-center gap-4">
                    <Link href={`/${locale}/bourse`} className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:text-white transition-colors mr-4 relative group">
                        <TrendingUp size={14} className="group-hover:scale-110 transition-transform" /> 
                        Bourse
                        <span className="absolute -top-3 -right-2 bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">HOT</span>
                    </Link>
                    <Link href={`/${locale}/login`} className="hidden md:block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-colors">Se connecter</Link>
                    
                    <Sheet>
                        <SheetTrigger asChild>
                            <button className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-white active:scale-90 transition shadow-xl border border-white/10">
                                <Menu className="h-5 w-5" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="right" className="bg-[#0f172a]/95 backdrop-blur-2xl p-0 w-full border-none shadow-none">
                            <div className="flex flex-col h-full safe-area-pt">
                                <header className="p-8 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-slate-950 font-black">N</div>
                                        <span className="font-black text-xl text-white uppercase tracking-tighter">Ndara</span>
                                    </div>
                                    <SheetClose className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500">
                                        <X size={20} />
                                    </SheetClose>
                                </header>
                                
                                <nav className="flex-1 p-8 space-y-8 overflow-y-auto">
                                    <MobileNavLink href={`/${locale}/search`}>Formations</MobileNavLink>
                                    <Link href={`/${locale}/bourse`} className="flex items-center gap-3 text-3xl font-black text-primary hover:text-white transition-colors uppercase tracking-tighter">
                                        Bourse <Badge className="bg-red-500 text-white border-none text-[10px] py-0 px-2 h-5">HOT</Badge>
                                    </Link>
                                    <MobileNavLink href={`/${locale}/about`}>Notre Vision</MobileNavLink>
                                    <MobileNavLink href={`/${locale}/abonnements`}>Abonnements</MobileNavLink>
                                    <MobileNavLink href={`/${locale}/devenir-instructeur`}>Devenir Formateur</MobileNavLink>
                                </nav>

                                <footer className="p-8 space-y-4 pb-12">
                                    <Button asChild className="w-full h-16 rounded-[2rem] bg-primary text-slate-950 font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 active:scale-95 transition-all">
                                        <Link href={`/${locale}/login?tab=register`}>Commencer Gratuitement</Link>
                                    </Button>
                                    <Link href={`/${locale}/login`} className="block text-center text-slate-500 font-bold uppercase text-[10px] tracking-widest py-2">Déjà membre ? Connexion</Link>
                                </footer>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </div>
    </nav>
  );
}

function MobileNavLink({ href, children }: { href: string, children: React.ReactNode }) {
    return (
        <Link href={href} className="block text-3xl font-black text-white hover:text-primary transition-colors uppercase tracking-tighter">
            {children}
        </Link>
    );
}
