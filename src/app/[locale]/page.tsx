import React from 'react';
import { Hero } from '@/components/landing/Hero';
import { Stats } from '@/components/landing/Stats';
import { Categories } from '@/components/landing/Categories';
import { PopularCourses } from '@/components/landing/PopularCourses';
import { NewCourses } from '@/components/landing/NewCourses';
import { TopInstructors } from '@/components/landing/TopInstructors';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { BourseIntroSection } from '@/components/landing/BourseIntroSection';
import { FintechSection } from '@/components/landing/FintechSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { InstructorCTASection } from '@/components/landing/InstructorCTASection';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { unstable_setRequestLocale } from 'next-intl/server';

/**
 * @fileOverview Landing Page Ndara Afrique V4 - Structure EdTech Haute Performance.
 * Reorganisée pour maximiser la conversion et la mise en valeur des experts.
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
        
        {/* 1. Hero & Search */}
        <Hero />

        {/* 2. Platform Stats */}
        <Stats />

        {/* 3. Browse by Category */}
        <Categories />

        {/* 4. Popular Courses (Limit 6) */}
        <PopularCourses />

        {/* 5. New Horizons (Recent Courses) */}
        <NewCourses />

        {/* 6. Concept Boursier (Unique Selling Point) */}
        <BourseIntroSection />

        {/* 7. How it works (The Journey) */}
        <HowItWorks />

        {/* 8. Top Instructors (Authority) */}
        <TopInstructors />

        {/* 9. Testimonials (Trust) */}
        <TestimonialsSection />

        {/* 10. Mobile Money Trust Bar */}
        <FintechSection />

        {/* 11. Final CTA for Instructors */}
        <InstructorCTASection />
      </main>

      <Footer />
    </div>
  );
}
