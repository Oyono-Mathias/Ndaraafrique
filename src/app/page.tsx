
'use client';

import React from 'react';
import Link from 'next/link';
import { Award, ShieldCheck, Wallet, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';
import { useRole } from '@/context/RoleContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { HowItWorks } from '@/components/landing/HowItWorks';

const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/80 transition-all duration-300 hover:border-primary/50 hover:scale-[1.02]">
    <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
      <Icon className="w-6 h-6 text-primary" />
    </div>
    <h3 className="text-lg font-bold text-white">{title}</h3>
    <p className="text-sm text-slate-400 mt-2">{description}</p>
  </div>
);

export default function LandingPage() {
  const { user, isUserLoading } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 pt-32 pb-16">
        <section className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white !leading-tight">
            La plateforme de formation <span className="text-primary">conçue pour l'Afrique</span>
          </h1>
          <p className="text-base md:text-lg text-slate-400 mt-6 max-w-2xl mx-auto">
            Accédez à des compétences d'avenir, payez simplement avec votre mobile, et construisez votre futur.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Button size="lg" asChild className="h-12 text-base shadow-cta">
              <Link href="/login?tab=register">
                Commencer maintenant <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Wallet}
              title="Paiement Simplifié"
              description="Payez vos formations en toute sécurité avec les solutions Mobile Money que vous utilisez déjà."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Confiance & Sécurité"
              description="Vos transactions et vos données sont protégées par les meilleures technologies de chiffrement."
            />
            <FeatureCard
              icon={Award}
              title="Certification Reconnue"
              description="Obtenez des certificats à la fin de chaque formation pour valider vos nouvelles compétences auprès des employeurs."
            />
          </div>
        </section>
        
        <HowItWorks />

      </main>
      <Footer />
    </div>
  );
}
