
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Award, ShieldCheck, Wallet, ArrowRight, Lock, Users, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { HowItWorks } from '@/components/landing/HowItWorks';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Stats } from '@/components/landing/Stats';
import { logTrackingEvent } from '@/app/actions/trackingActions';

const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/80 transition-all duration-300 hover:border-primary/50 hover:scale-[1.02]">
    <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
      <Icon className="w-6 h-6 text-primary" />
    </div>
    <h3 className="text-lg font-bold text-white">{title}</h3>
    <p className="text-sm text-slate-400 mt-2">{description}</p>
  </div>
);

const TrustAndSecuritySection = () => {
    const securityImage = PlaceHolderImages.find(img => img.id === 'payment-security');

    return (
        <section className="py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="relative h-80 lg:h-[450px] w-full">
                    {securityImage && (
                        <Image
                            src={securityImage.imageUrl}
                            alt={securityImage.description}
                            fill
                            className="object-cover rounded-2xl shadow-2xl"
                            data-ai-hint={securityImage.imageHint}
                        />
                    )}
                </div>
                <div className="space-y-6">
                    <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full">
                        Sécurité des transactions
                    </div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white">
                        Une plateforme de confiance pour vos paiements
                    </h2>
                    <p className="text-slate-400">
                        Chaque transaction est protégée par des technologies de chiffrement avancées. Nous collaborons avec des leaders du paiement pour garantir la sécurité et la traçabilité de chaque franc dépensé.
                    </p>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                            <div>
                                <h4 className="font-semibold text-white">Chiffrement de bout-en-bout</h4>
                                <p className="text-sm text-slate-400">Vos informations de paiement sont sécurisées à chaque étape.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                            <div>
                                <h4 className="font-semibold text-white">Partenaires de paiement certifiés</h4>
                                <p className="text-sm text-slate-400">Nous ne travaillons qu'avec des passerelles de paiement reconnues pour leur fiabilité.</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    );
};

const MobileMoneySection = ({ onTrackClick }: { onTrackClick: (provider: string) => void }) => (
    <section className="py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Payez simplement. Sans carte bancaire.
        </h2>
        <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
            Ndara Afrique est intégré avec les solutions de paiement que vous utilisez tous les jours. L'accès à vos formations est instantané.
        </p>
        <div className="mt-12 flex justify-center items-center gap-4 md:gap-8 flex-wrap">
            <div className="animate-fade-in-up" style={{ animationDelay: `0ms`, animationFillMode: 'both' }} onClick={() => onTrackClick('MTN')}>
                <div className="flex items-center justify-center h-20 w-44 rounded-xl bg-mtn-yellow shadow-lg cursor-pointer">
                    <span className="font-black text-2xl text-black">MTN</span>
                </div>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: `150ms`, animationFillMode: 'both' }} onClick={() => onTrackClick('Orange')}>
                 <div className="flex items-center justify-center h-20 w-44 rounded-xl bg-orange-money shadow-lg cursor-pointer">
                    <span className="font-black text-2xl text-white">orange</span>
                </div>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: `300ms`, animationFillMode: 'both' }} onClick={() => onTrackClick('Wave')}>
                 <div className="flex items-center justify-center h-20 w-44 rounded-xl bg-wave-blue shadow-lg cursor-pointer">
                    <span className="font-black text-3xl text-white">wave</span>
                </div>
            </div>
        </div>
    </section>
);

let sessionId = '';

export function LandingPageClient() {
  useEffect(() => {
    // Generate or retrieve session ID
    sessionId = sessionStorage.getItem('ndara-session-id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('ndara-session-id', sessionId);
    }

    // Log page view event
    logTrackingEvent({
      eventType: 'page_view',
      sessionId,
      pageUrl: '/',
    });
  }, []);

  const handleTrackedClick = (eventName: 'cta_click' | 'payment_method_click', metadata?: Record<string, any>) => {
    logTrackingEvent({
      eventType: eventName,
      sessionId,
      pageUrl: '/',
      metadata,
    });
  };

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
            <Button
              size="lg"
              asChild
              className="h-12 text-base shadow-cta"
              onClick={() => handleTrackedClick('cta_click', { button: 'hero_start' })}
            >
              <Link href="/login?tab=register">
                Commencer maintenant <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="py-24">
            <Stats />
        </section>

        <section className="py-12">
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

        <MobileMoneySection onTrackClick={(provider) => handleTrackedClick('payment_method_click', { provider })} />

        <TrustAndSecuritySection />

        <section className="py-24 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">
                Prêt à transformer votre avenir ?
            </h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">
                Rejoignez des milliers d'apprenants et de formateurs qui construisent l'Afrique de demain. L'inscription est gratuite.
            </p>
            <div className="mt-8 flex justify-center">
                <Button
                  size="lg"
                  asChild
                  className="h-14 text-lg shadow-cta"
                  onClick={() => handleTrackedClick('cta_click', { button: 'final_cta' })}
                >
                    <Link href="/login?tab=register">
                        Créer mon compte gratuit
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                </Button>
            </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
