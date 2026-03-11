'use client';

/**
 * @fileOverview Section "Comment ça marche" optimisée pour mobile.
 */

import { Search, Wallet, Brain, Check } from 'lucide-react';
import { cn } from "@/lib/utils";

const steps = [
  {
    title: '1. Choisir',
    description: 'Explorez notre catalogue de formations certifiantes adaptées à vos objectifs professionnels.',
    icon: Search,
    color: 'from-primary-500 to-primary-700',
    accent: 'text-primary-500',
    features: ['500+ formations', 'Tous niveaux', 'Certifications reconnues']
  },
  {
    title: '2. Payer',
    description: 'Réglez facilement avec Mobile Money. Orange, MTN, Wave - zéro complication.',
    icon: Wallet,
    color: 'from-emerald-500 to-emerald-700',
    accent: 'text-emerald-500',
    features: ['Mobile Money', 'Paiement sécurisé', 'Accès immédiat']
  },
  {
    title: '3. Apprendre',
    description: "Accédez à votre formation et bénéficiez de l'accompagnement personnalisé de l'IA Mathias.",
    icon: Brain,
    color: 'from-blue-500 to-blue-700',
    accent: 'text-blue-500',
    features: ['IA Mathias', 'Suivi personnalisé', 'Support 24/7']
  },
];

export function HowItWorks() {
  return (
    <section id="explorer" className="py-16 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 md:mb-20 space-y-4">
                <h2 className="text-3xl sm:text-6xl font-black uppercase tracking-tight leading-tight">
                    <span className="text-white">Comment ça </span>
                    <span className="gradient-text">marche ?</span>
                </h2>
                <p className="text-base md:text-xl text-gray-400 max-w-2xl mx-auto font-medium italic">
                    Trois étapes simples pour transformer votre parcours d'apprentissage en réussite concrète.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                {steps.map((step, idx) => (
                    <div 
                        key={idx} 
                        className="feature-card card-grain glassmorphism rounded-[2.5rem] p-8 md:p-10 flex flex-col items-start space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700"
                        style={{ animationDelay: `${idx * 200}ms` }}
                    >
                        <div className={cn(
                            "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-2xl relative",
                            `bg-gradient-to-br ${step.color}`
                        )}>
                            <step.icon className="h-6 w-6 md:h-8 md:w-8 text-white" />
                            <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 bg-white text-black h-6 w-6 md:h-8 md:w-8 rounded-full flex items-center justify-center font-black text-[10px] md:text-xs shadow-xl">
                                0{idx + 1}
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <h3 className="text-xl md:text-3xl font-black text-white uppercase tracking-tight">{step.title}</h3>
                            <p className="text-sm md:text-base text-gray-400 leading-relaxed font-medium">
                                {step.description}
                            </p>
                        </div>

                        <ul className="space-y-3 w-full pt-4 border-t border-white/5">
                            {step.features.map((feature, fIdx) => (
                                <li key={fIdx} className="flex items-center space-x-3 group">
                                    <div className={cn("h-5 w-5 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors", step.accent)}>
                                        <Check className="h-3 w-3" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    </section>
  );
}
