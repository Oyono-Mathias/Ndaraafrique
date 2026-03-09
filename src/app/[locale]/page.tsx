'use client';

/**
 * @fileOverview Landing Page Ndara Afrique - Version Officielle Restaurée.
 * ✅ DESIGN : Focus sur la vision, l'impact et la réassurance.
 * ✅ BUILD : Variable router initialisée correctement.
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { HowItWorks } from '@/components/landing/HowItWorks';
import dynamic from 'next/dynamic';

// Chargement dynamique des composants pour un LCP optimal
const DynamicCarousel = dynamic(() => import('@/components/ui/DynamicCarousel').then(mod => mod.DynamicCarousel), { ssr: false });
const Stats = dynamic(() => import('@/components/landing/Stats').then(mod => mod.Stats), { ssr: false });
const TrustAndSecuritySection = dynamic(() => import('@/components/landing/TrustAndSecuritySection').then(mod => mod.TrustAndSecuritySection), { ssr: false });
const TestimonialsSection = dynamic(() => import('@/components/landing/TestimonialsSection').then(mod => mod.TestimonialsSection), { ssr: false });
const InstructorCTASection = dynamic(() => import('@/components/landing/InstructorCTASection').then(mod => mod.InstructorCTASection), { ssr: false });
const Footer = dynamic(() => import('@/components/layout/footer').then(mod => mod.Footer), { ssr: false });
const Navbar = dynamic(() => import('@/components/layout/navbar').then(mod => mod.Navbar), { ssr: false });

export default function LandingPage() {
  const router = useRouter(); // ✅ Fix: router défini pour les interactions
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-primary/30">
      <Navbar />
     
      
      <main className="pt-16">
        {/* Section Hero : Carrousel de Vision */}
        <section className="py-12 px-4 max-w-7xl mx-auto">
          <div className="animate-in fade-in slide-in-from-top-4 duration-1000">
            <DynamicCarousel />
          </div>
        </section>

        {/* Section Preuve Sociale : Statistiques Réelles */}
        <section className="py-16 bg-slate-900/50 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-4">
            <Stats />
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 space-y-32 py-24">
          {/* Section Pédagogique : Comment ça marche */}
          <HowItWorks />

          {/* Section Réassurance : Confiance et Sécurité */}
          <TrustAndSecuritySection />

          {/* Section Humaine : Témoignages des Ndara */}
          <TestimonialsSection />

          {/* Section Partenariat : Appel aux Experts */}
          <InstructorCTASection onTrackClick={() => router.push('/devenir-instructeur')} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
