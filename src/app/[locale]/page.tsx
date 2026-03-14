import React from 'react';
import { Hero } from '@/components/landing/Hero';
import { Stats } from '@/components/landing/Stats';
import { Categories } from '@/components/landing/Categories';
import { PopularCourses } from '@/components/landing/PopularCourses';
import { FintechSection } from '@/components/landing/FintechSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { InstructorCTASection } from '@/components/landing/InstructorCTASection';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { unstable_setRequestLocale } from 'next-intl/server';

/**
 * @fileOverview Landing Page Ndara Afrique V3 - Redesign Android-First & Fintech Elite.
 * Intégration du design haute-fidélité de Qwen.
 */

interface Props {
  params: { locale: string };
}

export default function LandingPage({ params: { locale } }: Props) {
  unstable_setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-primary/30">
      <Navbar />
      
      <main className="smooth-scroll relative">
        <div className="grain-overlay opacity-[0.04]" />
        
        <Hero />
        <Stats />
        <Categories />
        <PopularCourses />
        <FintechSection />
        <TestimonialsSection />
        <InstructorCTASection />
      </main>

      <Footer />
    </div>
  );
}
