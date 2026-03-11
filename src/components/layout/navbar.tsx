'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useLocale } from 'next-intl';

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <SheetClose asChild>
    <Link href={href} className="block px-4 py-3 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800/50 transition-colors">
      {children}
    </Link>
  </SheetClose>
);

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const locale = useLocale();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500 h-20 flex items-center',
        scrolled ? 'bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl' : 'bg-transparent'
      )}
    >
      <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <span className="text-xl font-bold gradient-text tracking-tighter">Ndara</span>
        </Link>

        {/* Navigation (Desktop) */}
        <nav className="hidden md:flex items-center space-x-10">
          <Link href={`/${locale}/search`} className="text-sm font-bold uppercase tracking-widest text-gray-300 hover:text-white transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all hover:after:w-full">
            Explorer
          </Link>
          <Link href={`/${locale}/abonnements`} className="text-sm font-bold uppercase tracking-widest text-gray-300 hover:text-white transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all hover:after:w-full">
            Tarifs
          </Link>
          <Link href={`/${locale}/investir`} className="text-sm font-bold uppercase tracking-widest text-gray-300 hover:text-white transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all hover:after:w-full">
            Investir
          </Link>
          <Link href={`/${locale}/about`} className="text-sm font-bold uppercase tracking-widest text-gray-300 hover:text-white transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all hover:after:w-full">
            À propos
          </Link>
        </nav>

        {/* Buttons */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" asChild className="hidden md:flex rounded-full border border-primary/30 text-primary-400 hover:bg-primary/10 h-11 px-8 font-bold uppercase text-[10px] tracking-widest transition-all">
            <Link href={`/${locale}/login`}>Connexion</Link>
          </Button>
          <Button asChild className="rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-black uppercase text-[10px] tracking-widest h-11 px-8 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95">
            <Link href={`/${locale}/login?tab=register`}>Rejoindre</Link>
          </Button>
          
          {/* Mobile Menu Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-white h-10 w-10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-[#0f0f0f] border-r-white/10 w-[85%] max-w-[320px] p-0">
                <div className="flex flex-col h-full">
                    <header className="p-6 border-b border-white/5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-white font-bold text-sm">N</span>
                        </div>
                        <span className="text-lg font-black gradient-text uppercase tracking-tight">Ndara Afrique</span>
                    </header>
                    <nav className="flex-1 p-6 space-y-2">
                        <NavLink href={`/${locale}/search`}>Explorer</NavLink>
                        <NavLink href={`/${locale}/abonnements`}>Tarifs</NavLink>
                        <NavLink href={`/${locale}/investir`}>Investir</NavLink>
                        <NavLink href={`/${locale}/about`}>À propos</NavLink>
                    </nav>
                    <footer className="p-6 border-t border-white/5 bg-slate-900/50">
                        <SheetClose asChild>
                            <Button asChild variant="outline" className="w-full h-12 rounded-xl mb-3 border-white/10 text-white font-bold uppercase text-[10px] tracking-widest">
                                <Link href={`/${locale}/login`}>Se connecter</Link>
                            </Button>
                        </SheetClose>
                        <SheetClose asChild>
                            <Button asChild className="w-full h-12 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest">
                                <Link href={`/${locale}/login?tab=register`}>Créer un compte</Link>
                            </Button>
                        </SheetClose>
                    </footer>
                </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
