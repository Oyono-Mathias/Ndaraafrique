'use client';

/**
 * @fileOverview Page dédiée aux investisseurs et partenaires de Ndara Afrique.
 * Présente la vision, l'impact et la procédure pour rejoindre l'aventure.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Globe, Users, ShieldCheck, FileText, MessageCircle, CheckCircle2 } from 'lucide-react';

const ImpactStat = ({ icon: Icon, value, label }: { icon: React.ElementType, value: string, label: string }) => (
    <div className="text-center p-6 bg-slate-900/50 border border-slate-800 rounded-[2rem] shadow-xl">
        <div className="p-3 bg-primary/10 rounded-full inline-block mb-4">
            <Icon className="h-6 w-6 text-primary" />
        </div>
        <p className="text-3xl font-black text-white">{value}</p>
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">{label}</p>
    </div>
);

const ProcedureStep = ({ number, title, description }: { number: string, title: string, description: string }) => (
    <div className="flex gap-6 items-start">
        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shrink-0 font-black text-white shadow-lg shadow-primary/20">
            {number}
        </div>
        <div>
            <h3 className="font-bold text-white text-lg">{title}</h3>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">{description}</p>
        </div>
    </div>
);

export default function InvestPage() {
  return (
    <div className="min-h-screen bg-slate-950 pb-24 relative overflow-hidden bg-grainy">
        <header className="relative pt-24 pb-16 px-4 text-center space-y-6">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="inline-block p-2 px-4 bg-primary/10 border border-primary/20 rounded-full mb-4">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Opportunité d'Investissement</p>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight max-w-4xl mx-auto">
                Bâtissons ensemble le <br/>
                <span className="text-primary">Futur de l'Afrique.</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
                Ndara Afrique n'est pas seulement une plateforme, c'est l'infrastructure du savoir pour 500 millions de jeunes talents.
            </p>
        </header>

        <main className="max-w-6xl mx-auto px-4 space-y-24">
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ImpactStat icon={Users} value="500M+" label="Jeunes Talents" />
                <ImpactStat icon={Globe} value="54" label="Pays Visés" />
                <ImpactStat icon={TrendingUp} value="25%" label="Croissance EdTech" />
                <ImpactStat icon={ShieldCheck} value="100%" label="Impact Social" />
            </section>

            <section className="grid md:grid-cols-2 gap-12 items-start">
                <div className="space-y-8">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight">Comment <span className="text-primary">nous rejoindre ?</span></h2>
                    <div className="space-y-8">
                        <ProcedureStep 
                            number="01" 
                            title="Prise de contact" 
                            description="Envoyez-nous une demande d'intérêt via le formulaire ou par email. Notre équipe relations investisseurs vous répondra sous 48h."
                        />
                        <ProcedureStep 
                            number="02" 
                            title="Examen du Pitch Deck" 
                            description="Nous vous transmettrons notre dossier complet comprenant notre vision, nos metrics de croissance et notre roadmap technologique."
                        />
                        <ProcedureStep 
                            number="03" 
                            title="Due Diligence & Meeting" 
                            description="Rencontre avec les fondateurs pour approfondir la stratégie et valider l'alignement des valeurs."
                        />
                        <ProcedureStep 
                            number="04" 
                            title="Finalisation" 
                            description="Signature des accords de partenariat et intégration dans l'écosystème Ndara Afrique."
                        />
                    </div>
                </div>
                <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] p-8 shadow-2xl sticky top-24">
                    <div className="space-y-6">
                        <div className="p-4 bg-primary/10 rounded-2xl inline-block">
                            <FileText className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Demander le dossier</h3>
                        <p className="text-slate-400 text-sm">Recevez immédiatement notre présentation investisseur (Pitch Deck 2024) et nos prévisions financières.</p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span>Impact Panafricain</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span>Roadmap Technologique & IA</span>
                            </div>
                        </div>
                        <Button className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 mt-4" asChild>
                            <a href="mailto:oyonomathias@gmail.com?subject=Demande de Pitch Deck - Ndara Afrique">
                                Recevoir le Pitch Deck
                            </a>
                        </Button>
                    </div>
                </Card>
            </section>

            <section className="text-center space-y-8 bg-primary/5 p-12 rounded-[3rem] border border-primary/10">
                <div className="p-4 bg-emerald-500/10 rounded-full inline-block mx-auto">
                    <MessageCircle className="h-10 w-10 text-emerald-500" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">Besoin d'un échange direct ?</h2>
                <p className="text-slate-400 max-w-xl mx-auto">
                    Vous souhaitez discuter d'un partenariat stratégique ou d'une opportunité spécifique ? Parlons-en de vive voix via WhatsApp.
                </p>
                <div className="flex justify-center">
                    <Button variant="outline" size="lg" className="h-14 px-10 rounded-xl border-slate-800 bg-slate-900 text-slate-300 font-black uppercase text-[10px] tracking-widest hover:bg-slate-800" asChild>
                        <a href="https://wa.me/23675000000?text=Bonjour Mathias, je souhaite discuter d'un investissement sur Ndara Afrique." target="_blank" rel="noopener noreferrer">
                            Discuter sur WhatsApp
                        </a>
                    </Button>
                </div>
            </section>
        </main>
    </div>
  );
}