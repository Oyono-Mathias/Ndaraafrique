
'use client';

/**
 * @fileOverview Page dédiée aux investisseurs et partenaires de Ndara Afrique.
 * Présente la vision, l'impact et comment rejoindre l'aventure financièrement.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Globe, Users, ShieldCheck, ArrowRight, Lightbulb, Target } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const ImpactStat = ({ icon: Icon, value, label }: { icon: React.ElementType, value: string, label: string }) => (
    <div className="text-center p-6 bg-slate-900/50 border border-slate-800 rounded-[2rem] shadow-xl">
        <div className="p-3 bg-primary/10 rounded-full inline-block mb-4">
            <Icon className="h-6 w-6 text-primary" />
        </div>
        <p className="text-3xl font-black text-white">{value}</p>
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">{label}</p>
    </div>
);

export default function InvestPage() {
  return (
    <div className="min-h-screen bg-slate-950 pb-24 relative overflow-hidden bg-grainy">
        {/* --- HERO SECTION --- */}
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
            
            {/* --- IMPACT STATS --- */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ImpactStat icon={Users} value="500M+" label="Jeunes Talents" />
                <ImpactStat icon={Globe} value="54" label="Pays Visés" />
                <ImpactStat icon={TrendingUp} value="25%" label="Croissance EdTech" />
                <ImpactStat icon={ShieldCheck} value="100%" label="Impact Social" />
            </section>

            {/* --- LA VISION --- */}
            <section className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight">Pourquoi <span className="text-primary">Investir ?</span></h2>
                    <p className="text-slate-400 leading-relaxed">
                        Le marché de l'éducation en ligne en Afrique connaît une révolution sans précédent. Avec une population dont la moyenne d'âge est de 19 ans, le besoin de formations certifiantes et accessibles est immense.
                    </p>
                    <div className="space-y-4">
                        {[
                            { title: "Scalabilité", text: "Infrastucture cloud robuste capable d'accueillir des millions d'utilisateurs." },
                            { title: "Localisation", text: "Contenus adaptés aux réalités du marché et aux langues locales." },
                            { title: "Monétisation", text: "Paiements fluides via Mobile Money (MTN, Orange, Wave)." }
                        ].map((item, idx) => (
                            <div key={idx} className="flex gap-4">
                                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                    <ArrowRight className="h-3 w-3 text-primary" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                                    <p className="text-xs text-slate-500">{item.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="relative aspect-square rounded-[3rem] overflow-hidden border border-slate-800 shadow-2xl">
                    <Image 
                        src="https://picsum.photos/seed/ndarainvest/800/800" 
                        alt="Vision Ndara" 
                        fill 
                        className="object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-700"
                        data-ai-hint="african business people"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent" />
                </div>
            </section>

            {/* --- ACTION --- */}
            <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] p-8 md:p-12 text-center shadow-2xl">
                <CardHeader>
                    <div className="p-4 bg-primary/10 rounded-full inline-block mx-auto mb-6">
                        <Lightbulb className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-black text-white uppercase tracking-tight">Prêt à rejoindre l'aventure ?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    <p className="text-slate-400 max-w-xl mx-auto">
                        Nous sommes ouverts aux partenariats stratégiques et aux levées de fonds pour accélérer notre déploiement panafricain.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button size="lg" className="h-14 px-10 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20" asChild>
                            <a href="mailto:oyonomathias@gmail.com?subject=Investissement Ndara Afrique">
                                Demander le Pitch Deck
                            </a>
                        </Button>
                        <Button variant="outline" size="lg" className="h-14 px-10 rounded-xl border-slate-800 bg-slate-900 text-slate-300 font-black uppercase text-[10px] tracking-widest" asChild>
                            <Link href="/student/support">
                                Contacter l'Équipe
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

        </main>
    </div>
  );
}
