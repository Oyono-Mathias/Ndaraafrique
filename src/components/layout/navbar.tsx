'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Set initial state
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-slate-900/80 backdrop-blur-sm border-b border-slate-800'
          : 'bg-transparent'
      )}
    >
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3 group">
          <Image src="/icon.svg" alt="Ndara Afrique Logo" width={32} height={32} />
          <span className="text-xl font-bold text-white transition-colors group-hover:text-primary">
            Ndara Afrique
          </span>
        </Link>

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

        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild className="hidden text-slate-300 hover:text-white md:inline-flex">
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button asChild className="group">
            <Link href="/login?tab=register">
              Commencer
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
