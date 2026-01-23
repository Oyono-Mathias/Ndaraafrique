
'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useDoc } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import type { Settings } from '@/lib/types';

const steps = [
  {
    id: 'step1',
    icon: '1',
    title: '1. Explorez & Choisissez',
    description: 'Trouvez la formation idéale parmi un catalogue de cours conçus par les meilleurs experts du continent.',
    imageId: 'browse-courses',
  },
  {
    id: 'step2',
    icon: '2',
    title: '2. Payez avec votre mobile',
    description: "Validez votre inscription en quelques secondes avec Orange Money, MTN MoMo ou Wave. C'est simple et 100% sécurisé.",
    imageId: 'mobile-payment',
  },
  {
    id: 'step3',
    icon: '3',
    title: '3. Apprenez & Réussissez',
    description: 'Suivez les cours à votre rythme et obtenez une certification pour valoriser vos nouvelles compétences sur le marché du travail.',
    imageId: 'certificate',
  },
];

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(steps[0].id);

  const db = getFirestore();
  const settingsRef = useMemo(() => doc(db, 'settings', 'global'), [db]);
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

  return (
    <section className="py-16 md:py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white">
          Apprendre n'a jamais été aussi simple
        </h2>
        <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
          En trois étapes claires, commencez votre parcours vers l'excellence et la réussite professionnelle.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="relative h-80 lg:h-[450px] w-full lg:order-last">
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
                                loading="lazy"
                            />
                        )}
                    </div>
                )
            })}
        </div>
        <div className="space-y-4 lg:order-first">
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
              <div className="flex items-start gap-4">
                <div>
                  <h3 className="font-bold text-white text-lg">{step.title}</h3>
                  <p className="text-sm text-slate-400 mt-1">{step.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
