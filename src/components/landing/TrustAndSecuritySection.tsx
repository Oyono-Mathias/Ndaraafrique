
'use client';

import { ShieldCheck, Lock, CreditCard } from 'lucide-react';
import { useDoc } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import type { Settings } from '@/lib/types';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useMemo } from 'react';

const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => {
    return (
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
                <div className="p-3 bg-primary/10 rounded-full">
                    <Icon className="h-6 w-6 text-primary" />
                </div>
            </div>
            <div>
                <h3 className="font-bold text-white text-lg">{title}</h3>
                <p className="text-slate-400 mt-1">{description}</p>
            </div>
        </div>
    );
};

export function TrustAndSecuritySection() {
  const db = getFirestore();
  const settingsRef = useMemo(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings } = useDoc<Settings>(settingsRef);
  const landingPageContent = settings?.content?.landingPage;

  const imageUrl = landingPageContent?.securitySection_imageUrl || PlaceHolderImages.find(img => img.id === 'payment-security')?.imageUrl || '';

  return (
    <section className="py-16 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div className="relative h-80 lg:h-96 w-full order-last lg:order-first">
        <Image
          src={imageUrl}
          alt="Illustration de la sécurité des paiements"
          fill
          className="object-cover rounded-2xl shadow-2xl shadow-slate-900"
          data-ai-hint="digital security"
          loading="lazy"
        />
      </div>
      <div className="space-y-8">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white">
          Votre confiance, notre priorité absolue.
        </h2>
        <div className="space-y-6">
            <FeatureCard
                icon={ShieldCheck}
                title="Transactions Vérifiées"
                description="Chaque transaction est enregistrée et sécurisée pour une transparence totale et une prévention active de la fraude."
            />
            <FeatureCard
                icon={Lock}
                title="Données 100% Protégées"
                description="Vos informations personnelles sont chiffrées et protégées selon les standards de sécurité les plus stricts."
            />
            <FeatureCard
                icon={CreditCard}
                title="Paiements Simplifiés"
                description="Payez en quelques secondes via les services que vous utilisez et auxquels vous faites confiance, sans friction."
            />
        </div>
      </div>
    </section>
  );
}
