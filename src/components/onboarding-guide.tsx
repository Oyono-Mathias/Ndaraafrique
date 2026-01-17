
'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bot, Search, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourStep {
  id: string;
  title: string;
  description: string;
  targetId: string;
  icon: React.ElementType;
}

const tourSteps: TourStep[] = [
  {
    id: 'step1',
    title: "Recherchez des cours",
    description: "Utilisez la barre de recherche pour trouver des formations sur n'importe quel sujet qui vous passionne.",
    targetId: 'sidebar-nav-search',
    icon: Search,
  },
  {
    id: 'step2',
    title: 'Discutez avec MATHIAS',
    description: "Votre tuteur IA est là pour répondre à toutes vos questions et vous guider dans votre apprentissage.",
    targetId: 'sidebar-nav-tutor',
    icon: Bot,
  },
  {
    id: 'step3',
    title: 'Obtenez vos certificats',
    description: "Une fois un cours terminé, retrouvez tous vos certificats ici pour les partager fièrement.",
    targetId: 'sidebar-nav-mes-certificats',
    icon: Award,
  },
];

export function OnboardingGuide() {
  const { user } = useRole();
  const [isClient, setIsClient] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined' && user) {
      const hasOnboarded = localStorage.getItem('Ndara Afrique-onboarded');
      if (!hasOnboarded) {
        setShowWelcome(true);
      }
    }
  }, [user]);

  const startTour = () => {
    setShowWelcome(false);
    setTourStep(0);
  };

  const nextStep = () => {
    if (tourStep === null) return;
    if (tourStep < tourSteps.length - 1) {
      setTourStep(tourStep + 1);
    } else {
      finishTour();
    }
  };

  const finishTour = () => {
    setTourStep(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('Ndara Afrique-onboarded', 'true');
    }
  };

  if (!isClient) {
    return null;
  }

  const currentStepData = tourStep !== null ? tourSteps[tourStep] : null;

  return (
    <>
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">Bienvenue sur Ndara Afrique !</DialogTitle>
            <DialogDescription className="mt-2">Prêt à commencer votre parcours d'apprentissage ? Suivez cette courte visite guidée pour découvrir les fonctionnalités clés.</DialogDescription>
          </DialogHeader>
          <Button onClick={startTour} className="mt-4">Commencer la visite</Button>
        </DialogContent>
      </Dialog>
      
      {currentStepData && (
        <Popover open={true}>
            <PopoverTrigger asChild>
                <div 
                    id={`popover-trigger-${currentStepData.targetId}`}
                    className="fixed"
                    style={{
                        top: `var(--popover-trigger-top)`,
                        left: `var(--popover-trigger-left)`,
                    }}
                ></div>
            </PopoverTrigger>
            <PopoverContent
                side="right"
                align="start"
                sideOffset={20}
                className="w-80 shadow-2xl z-[10000] dark:bg-slate-800 dark:border-slate-700"
                onInteractOutside={finishTour}
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-primary/10 rounded-full">
                            <currentStepData.icon className="h-5 w-5 text-primary" />
                        </div>
                        <h4 className="font-bold leading-none text-base dark:text-white">{currentStepData.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground dark:text-slate-300">{currentStepData.description}</p>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{tourStep! + 1} / {tourSteps.length}</span>
                        <Button onClick={nextStep} size="sm">
                            {tourStep === tourSteps.length - 1 ? 'Terminer' : 'Suivant'}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
            <style jsx global>{`
              .tour-highlight {
                position: relative;
                z-index: 9999;
                background-color: hsl(var(--card));
                border: 2px solid hsl(var(--primary));
                box-shadow: 0 0 0 4px hsl(var(--primary) / 0.2), 0 0 15px 5px rgba(0,0,0,0.3);
                border-radius: var(--radius);
              }
            `}</style>
            <script dangerouslySetInnerHTML={{
                __html: `
                    (function() {
                        const targetElement = document.getElementById('${currentStepData.targetId}');
                        if (targetElement) {
                            const rect = targetElement.getBoundingClientRect();
                            const trigger = document.getElementById('popover-trigger-${currentStepData.targetId}');
                            
                            if (trigger) {
                                trigger.style.setProperty('--popover-trigger-top', \`\${rect.top + (rect.height / 2)}px\`);
                                trigger.style.setProperty('--popover-trigger-left', \`\${rect.left + rect.width}px\`);
                            }
                            
                            document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
                            targetElement.classList.add('tour-highlight');
                        }
                    })();
                `
            }} />
        </Popover>
      )}
    </>
  );
}
