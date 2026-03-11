import React from 'react';
import { Hero } from '@/components/landing/Hero';
import { Stats } from '@/components/landing/Stats';
import { PopularCourses } from '@/components/landing/PopularCourses';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { FintechSection } from '@/components/landing/FintechSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { InstructorCTASection } from '@/components/landing/InstructorCTASection';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { unstable_setRequestLocale } from 'next-intl/server';

/**
 * @fileOverview Landing Page Ndara Afrique.
 * ✅ OPTIMISÉ : Composant Serveur pour le SSG et l'i18n.
 */

interface Props {
  params: { locale: string };
}

export default function LandingPage({ params: { locale } }: Props) {
  // Nécessaire pour la génération de pages statiques avec next-intl
  unstable_setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans selection:bg-primary/30 relative">
      <div className="fixed inset-0 bg-[linear-gradient(135deg,#0f0f0f_0%,#1a1a2e_50%,#16213e_100%)] -z-10" />
      
      <Navbar />
      
      <main className="relative overflow-hidden">
        <Hero />
        <Stats />
        <PopularCourses />

        <div className="container mx-auto space-y-12 md:space-y-24 px-4 sm:px-6">
          <HowItWorks />
          <FintechSection />
          <TestimonialsSection />
          <InstructorCTASection />
        </div>
      </main>

      <Footer />
    </div>
  );
}
