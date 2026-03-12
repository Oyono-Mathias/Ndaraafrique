import React from 'react';
import { Hero } from '@/components/landing/Hero';
import { Stats } from '@/components/landing/Stats';
import { Categories } from '@/components/landing/Categories';
import { PopularCourses } from '@/components/landing/PopularCourses';
import { WhyUs } from '@/components/landing/WhyUs';
import { CTASection } from '@/components/landing/CTASection';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { unstable_setRequestLocale } from 'next-intl/server';

/**
 * @fileOverview Landing Page Ndara Afrique V2.
 * ✅ DESIGN QWEN : Intégration fidèle du code vitrine.
 * ✅ I18N : Support du multilingue Next-Intl.
 */

interface Props {
  params: { locale: string };
}

export default function LandingPage({ params: { locale } }: Props) {
  unstable_setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 selection:bg-ndara-orange/30">
      <Navbar />
      
      <main className="smooth-scroll">
        <Hero />
        <Stats />
        <Categories />
        <PopularCourses />
        <WhyUs />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
