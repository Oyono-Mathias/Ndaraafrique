'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, Search } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useLocale } from 'next-intl';

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <SheetClose asChild>
    <Link href={href} className="text-gray-500 hover:text-ndara-orange px-3 py-2 rounded-md text-sm font-bold uppercase tracking-widest transition-colors">
      {children}
    </Link>
  </SheetClose>
);

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const locale = useLocale();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={cn(
        "fixed w-full z-50 transition-all duration-300 h-20 flex items-center",
        scrolled ? "bg-white/95 backdrop-blur-sm shadow-md" : "bg-white"
    )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex justify-between items-center">
                <div className="flex items-center">
                    <Link href={`/${locale}`} className="flex-shrink-0 flex items-center gap-2 group">
                        <div className="w-10 h-10 bg-ndara-orange rounded-lg flex items-center justify-center text-white font-bold text-xl transition-transform group-hover:scale-110">N</div>
                        <span className="font-heading font-bold text-2xl text-ndara-dark tracking-tight uppercase">Ndara</span>
                    </Link>
                    <div className="hidden md:ml-10 md:flex md:space-x-4">
                        <Link href={`/${locale}/#categories`} className="text-gray-500 hover:text-ndara-orange px-3 py-2 rounded-md text-xs font-black uppercase tracking-widest transition">Catégories</Link>
                        <Link href={`/${locale}/search`} className="text-gray-500 hover:text-ndara-orange px-3 py-2 rounded-md text-xs font-black uppercase tracking-widest transition">Formations</Link>
                        <Link href={`/${locale}/about`} className="text-gray-500 hover:text-ndara-orange px-3 py-2 rounded-md text-xs font-black uppercase tracking-widest transition">Pourquoi Ndara ?</Link>
                    </div>
                </div>
                <div className="hidden md:flex items-center space-x-6">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Rechercher..." 
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-full text-xs font-bold bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ndara-orange focus:border-transparent w-48 lg:w-64 transition-all"
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
                    </div>
                    <Link href={`/${locale}/login`} className="text-gray-600 hover:text-ndara-dark font-black uppercase text-[10px] tracking-widest">Se connecter</Link>
                    <Button asChild size="sm" className="bg-ndara-dark text-white px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition shadow-lg hover:shadow-xl active:scale-95">
                        <Link href={`/${locale}/login?tab=register`}>S'inscrire</Link>
                    </Button>
                </div>
                
                <div className="flex items-center md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-gray-500">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="bg-white p-0 w-[80%] border-none">
                            <div className="flex flex-col h-full">
                                <header className="p-6 border-b flex items-center gap-3">
                                    <div className="w-8 h-8 bg-ndara-orange rounded flex items-center justify-center text-white font-bold">N</div>
                                    <span className="font-heading font-bold text-xl text-ndara-dark uppercase tracking-tight">Ndara</span>
                                </header>
                                <div className="flex-1 p-6 space-y-4">
                                    <Link href={`/${locale}/#categories`} className="block font-bold text-gray-700 uppercase text-sm tracking-widest">Catégories</Link>
                                    <Link href={`/${locale}/search`} className="block font-bold text-gray-700 uppercase text-sm tracking-widest">Formations</Link>
                                    <Link href={`/${locale}/about`} className="block font-bold text-gray-700 uppercase text-sm tracking-widest">Pourquoi Ndara ?</Link>
                                </div>
                                <footer className="p-6 border-t space-y-3">
                                    <Button asChild className="w-full h-12 rounded-xl bg-ndara-orange text-white font-black uppercase tracking-widest text-xs">
                                        <Link href={`/${locale}/login?tab=register`}>S'inscrire gratuitement</Link>
                                    </Button>
                                    <Button asChild variant="outline" className="w-full h-12 rounded-xl border-gray-200 text-gray-700 font-bold uppercase tracking-widest text-xs">
                                        <Link href={`/${locale}/login`}>Connexion</Link>
                                    </Button>
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
