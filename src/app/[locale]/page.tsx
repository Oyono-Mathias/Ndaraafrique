'use client';

/**
 * @fileOverview Landing Page Ndara Afrique - Intégration Design Qwen.
 * ✅ DESIGN : Nouvelle identité visuelle prestige (Slate-950, Emerald, Ocre).
 * ✅ STRUCTURE : Modulaire et Android-First.
 */

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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans selection:bg-primary/30 relative">
      {/* Fond dégradé global pour l'immersion (Blueprint Qwen) */}
      <div className="fixed inset-0 bg-[linear-gradient(135deg,#0f0f0f_0%,#1a1a2e_50%,#16213e_100%)] -z-10" />
      
      <Navbar />
      
      <main className="relative overflow-hidden">
        {/* 1. Hero Section (L'Éveil) */}
        <Hero />

        {/* 2. Trust Bar (Preuve Sociale Firestore) */}
        <Stats />

        {/* 3. Popular Courses (Nouveau) */}
        <PopularCourses />

        <div className="container mx-auto space-y-12 md:space-y-24 px-4 sm:px-6">
          {/* 4. Parcours Ndara (Feature Grid) */}
          <HowItWorks />

          {/* 5. Liberté de Paiement (Fintech Section) */}
          <FintechSection />

          {/* 6. Le Mur de la Sagesse (Testimonials) */}
          <TestimonialsSection />

          {/* 7. L'Appel de l'Expertise (Final CTA) */}
          <InstructorCTASection />
        </div>
      </main>

      <Footer />
    </div>
  );
}
