
'use client';

import { useState, useEffect } from 'react';
import { Link } from 'next-intl/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <SheetClose asChild>
    <Link href={href} className="block px-4 py-3 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800">
      {children}
    </Link>
  </SheetClose>
);

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-slate-900/80 backdrop-blur-sm border-b border-slate-800' : 'bg-transparent'
      )}
    >
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3 group">
          <Image src="/icon.svg" alt="Ndara Afrique Logo" width={32} height={32} />
          <span className="text-xl font-bold text-white transition-colors group-hover:text-primary">
            Ndara Afrique
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex">
          <Link href="/search" className="transition-colors hover:text-white">
            Explorer
          </Link>
          <Link href="/abonnements" className="transition-colors hover:text-white">
            Tarifs
          </Link>
           <Link href="/about" className="transition-colors hover:text-white">
            À propos
          </Link>
        </nav>

        {/* Mobile Navigation & CTA */}
        <div className="flex items-center gap-2 md:hidden">
            <Button asChild className="group">
              <Link href="/login?tab=register">
                S'inscrire
              </Link>
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6 text-white"/>
                  <span className="sr-only">Ouvrir le menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-slate-900 border-r-slate-800 w-[80%] max-w-[300px]">
                  <nav className="flex flex-col p-4 pt-16 space-y-2">
                     <NavLink href="/search">Explorer</NavLink>
                     <NavLink href="/abonnements">Tarifs</NavLink>
                     <NavLink href="/about">À propos</NavLink>
                     <div className="pt-4">
                        <SheetClose asChild>
                          <Button asChild className="w-full">
                            <Link href="/login">Se connecter</Link>
                          </Button>
                        </SheetClose>
                     </div>
                  </nav>
              </SheetContent>
            </Sheet>
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" asChild className="text-slate-300 hover:text-white">
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button asChild className="group">
            <Link href="/login?tab=register">
              S'inscrire
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

    