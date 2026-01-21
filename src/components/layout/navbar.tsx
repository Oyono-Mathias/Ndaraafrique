'use client';

import { useState, useEffect } from 'react';
import { Link } from 'next-intl/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
        scrolled ? 'bg-background/80 backdrop-blur-sm border-b border-slate-700/80' : 'bg-transparent'
      )}
    >
      <div className="container mx-auto px-4 h-20 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <Image src="/icon.svg" alt="Ndara Afrique Logo" width={28} height={28} />
          <span className="text-lg font-bold text-white group-hover:text-primary transition-colors">Ndara Afrique</span>
        </Link>
        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" asChild className="px-3 md:px-4">
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button asChild className="shadow-cta h-10 px-4 text-sm md:h-11 md:px-6 md:text-base">
            <Link href="/login?tab=register">S'inscrire</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
