'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import type { Settings } from '@/lib/types';

const steps = [
  {
    id: 'step1',
    icon: '1',
    title: 'Choisissez votre formation',
    description: 'Parcourez notre catalogue de cours conçus par des experts africains pour répondre aux besoins du marché local.',
    imageId: 'browse-courses',
  },
  {
    id: 'step2',
    icon: '2',
    title: 'Payez simplement',
    description: 'Utilisez votre méthode de paiement mobile préférée (Orange Money, MTN, etc.) pour un accès instantané et sécurisé.',
    imageId: 'mobile-payment',
  },
  {
    id: 'step3',
    icon: '3',
    title: 'Obtenez votre certification',
    description: 'Recevez un certificat reconnu à la fin de votre formation pour valider vos nouvelles compétences auprès des employeurs.',
    imageId: 'certificate',
  },
];

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(steps[0].id);

  const db = getFirestore();
  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings } = useDoc<Settings>(settingsRef);

  const landingPageContent = settings?.content?.landingPage;

  const stepsWithImages = steps.map((step, index) => {
    const defaultImage = PlaceHolderImages.find(img => img.id === step.imageId);
    let imageUrl = defaultImage?.imageUrl || '';
    
    if (landingPageContent) {
        if (index === 0) imageUrl = landingPageContent.howItWorks_step1_imageUrl || imageUrl;
        if (index === 1) imageUrl = landingPageContent.howItWorks_step2_imageUrl || imageUrl;
        if (index === 2) imageUrl = landingPageContent.howItWorks_step3_imageUrl || imageUrl;
    }
    
    return {
        ...step,
        imageUrl,
        imageHint: defaultImage?.imageHint || '',
    }
  });

  const activeStepData = stepsWithImages.find(s => s.id === activeStep);

  return (
    <section className="py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white">
          Apprendre n'a jamais été aussi simple
        </h2>
        <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
          En trois étapes simples, commencez votre parcours vers l'excellence.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-4">
          {steps.map(step => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={cn(
                'w-full p-6 text-left rounded-xl border-2 transition-all duration-300',
                activeStep === step.id
                  ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10'
                  : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all',
                    activeStep === step.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-slate-700 text-slate-300'
                  )}
                >
                  {step.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{step.title}</h3>
                  <p className="text-sm text-slate-400 mt-1">{step.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="relative h-80 lg:h-[450px] w-full">
            {stepsWithImages.map(step => {
                return (
                    <div key={step.id} className={cn(
                        "absolute inset-0 transition-opacity duration-500 ease-in-out",
                        activeStep === step.id ? 'opacity-100' : 'opacity-0'
                    )}>
                        {step.imageUrl && (
                            <Image
                                src={step.imageUrl}
                                alt={step.title}
                                fill
                                className="object-cover rounded-2xl shadow-2xl"
                                data-ai-hint={step.imageHint}
                            />
                        )}
                    </div>
                )
            })}
        </div>
      </div>
    </section>
  );
}
