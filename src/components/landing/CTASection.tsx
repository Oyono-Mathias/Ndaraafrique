'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export function CTASection() {
  const locale = useLocale();

  return (
    <section className="py-20 bg-ndara-dark relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10 space-y-8">
            <h2 className="text-3xl md:text-5xl font-heading font-bold text-white uppercase tracking-tight leading-tight">Prêt à transformer votre avenir ?</h2>
            <p className="text-gray-300 text-lg md:text-xl font-medium italic">Rejoignez Ndara aujourd'hui et accédez à des milliers de formations pour booster votre carrière.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                <Button asChild size="lg" className="h-16 px-10 rounded-full bg-ndara-orange hover:bg-orange-600 text-white font-black uppercase text-sm tracking-widest shadow-xl shadow-orange-500/30 active:scale-95 transition-all">
                    <Link href={`/${locale}/login?tab=register`}>Commencer Gratuitement</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-16 px-10 rounded-full border-gray-500 text-white hover:bg-white hover:text-ndara-dark font-bold uppercase text-xs tracking-widest transition-all">
                    <Link href={`/${locale}/student/support`}>Contacter le Support</Link>
                </Button>
            </div>
        </div>
    </section>
  );
}
