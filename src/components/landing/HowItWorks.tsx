'use client';

/**
 * @fileOverview Section "Comment ça marche" - Le Parcours Ndara V4.
 */

import { Search, PlayCircle, Trophy, Check } from 'lucide-react';
import { cn } from "@/lib/utils";

const steps = [
  {
    title: '1. Choisir',
    description: 'Explorez le catalogue d\'experts et trouvez la formation qui répond à vos ambitions professionnelles.',
    icon: Search,
    color: 'from-blue-500 to-blue-700',
    accent: 'text-blue-400',
    features: ['AgriTech', 'FinTech', 'Trading']
  },
  {
    title: '2. Apprendre',
    description: 'Accédez instantanément à vos cours et bénéficiez de l\'assistance 24h/24 de Mathias, votre tuteur IA.',
    icon: PlayCircle,
    color: 'from-primary to-emerald-700',
    accent: 'text-primary',
    features: ['Vidéo HD', 'Accès Mobile', 'IA Mathias']
  },
  {
    title: '3. Réussir',
    description: "Validez vos quiz, remettez vos devoirs et obtenez un certificat officiel reconnu pour propulser votre carrière.",
    icon: Trophy,
    color: 'from-amber-500 to-orange-700',
    accent: 'text-amber-400',
    features: ['Certificat', 'Badges', 'Impact']
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 px-6 relative overflow-hidden bg-black/20">
        <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-20 space-y-4">
                <div className="inline-block p-2 px-4 bg-primary/10 rounded-full mb-2">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Votre Voyage vers l'Excellence</p>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight leading-tight">
                    Comment ça <span className="text-primary">marche ?</span>
                </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                {steps.map((step, idx) => (
                    <div 
                        key={idx} 
                        className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-start space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 shadow-2xl relative group hover:border-primary/20 transition-all"
                        style={{ animationDelay: `${idx * 200}ms` }}
                    >
                        <div className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl relative transition-transform group-hover:scale-110",
                            `bg-gradient-to-br ${step.color}`
                        )}>
                            <step.icon className="h-7 w-7 text-white" />
                            <div className="absolute -bottom-1 -right-1 bg-white text-slate-950 h-7 w-7 rounded-full flex items-center justify-center font-black text-xs shadow-xl">
                                0{idx + 1}
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">{step.title}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed font-medium italic">
                                "{step.description}"
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5 w-full">
                            {step.features.map((feature, fIdx) => (
                                <Badge key={fIdx} variant="outline" className={cn("bg-transparent border-white/10 text-[8px] font-black uppercase tracking-widest", step.accent)}>
                                    {feature}
                                </Badge>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
  );
}

function Badge({ children, variant, className }: any) {
    return <span className={cn("px-2 py-1 rounded-md border", className)}>{children}</span>;
}
