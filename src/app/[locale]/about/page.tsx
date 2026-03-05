'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronsRight, Loader2, Users } from 'lucide-react';
import Link from 'next/link';
import { useDoc } from '@/firebase';
import { useMemo } from 'react';
import { doc, getFirestore } from 'firebase/firestore';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Settings } from '@/lib/types';

const SangoQuote = ({ children }: { children: React.ReactNode }) => (
    <blockquote className="relative text-center my-12 md:my-16">
        <p className="text-2xl md:text-4xl font-black text-white italic leading-tight" style={{ textShadow: '0 0 15px hsl(var(--primary)/0.4)' }}>
            "{children}"
        </p>
    </blockquote>
);

const Section = ({ title, frenchText, sangoText, children }: { title: string, frenchText?: string, sangoText?: string, children?: React.ReactNode }) => (
    <section className="mb-16 md:mb-24">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-8 border-l-4 border-primary pl-6 uppercase tracking-tighter">{title}</h2>
        {frenchText && (
            <div className="prose prose-lg prose-invert max-w-none text-slate-300 space-y-6">
                <p className="leading-relaxed">{frenchText}</p>
                {sangoText && <p className="text-primary/80 font-bold italic text-base md:text-lg border-t border-white/5 pt-4">Sango: {sangoText}</p>}
            </div>
        )}
        {children}
    </section>
);

export default function AboutPage() {
  const db = getFirestore();
  const settingsRef = useMemo(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings, isLoading } = useDoc<Settings>(settingsRef);

  const content = settings?.content?.aboutPage;
  const team = content?.teamMembers || [];
  
  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 p-16 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden bg-grainy">
        <div className="relative z-10 container mx-auto px-4 py-16 md:py-32">
            <header className="text-center mb-24 md:mb-32 animate-in fade-in slide-in-from-top-4 duration-1000">
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white uppercase leading-none">
                    {content?.mainTitle || "Le Manifeste Ndara"}
                </h1>
                <p className="mt-6 text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto font-medium italic">
                    {content?.mainSubtitle || "Mouvement pour l'émancipation technologique du continent."}
                </p>
            </header>

            <main className="max-w-4xl mx-auto">
                <Section
                    title={content?.historyTitle || "Notre Histoire"}
                    frenchText={content?.historyFrench || "Ndara Afrique est né d'une conviction profonde : le savoir est le levier le plus puissant pour le changement. Nous bâtissons l'infrastructure qui connecte les experts aux talents de demain."}
                    sangoText={content?.historySango || "Ndara ayeke kpengba lege ti changement ti kodoro ti e."}
                />

                <SangoQuote>Bara ala, Tonga na ndara.</SangoQuote>
                
                <Section
                    title={content?.visionTitle || "Notre Vision"}
                    frenchText={content?.visionFrench || "Faire de l'Afrique un créateur de technologie de premier plan. Nous croyons que chaque jeune africain, armé du bon savoir, peut coder le futur du monde."}
                    sangoText={content?.visionSango || "Vision ti e ayeke ti tene Afrique aga mbeni kota zo ti technologie na sese mobimba."}
                />

                {/* --- ÉQUIPE DYNAMIQUE --- */}
                {team.length > 0 && (
                    <section className="mb-24">
                        <div className="flex items-center gap-3 mb-12">
                            <Users className="h-8 w-8 text-primary" />
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">L'Équipe de Direction</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            {team.map((member, i) => (
                                <div key={i} className="bg-slate-900/40 border border-white/5 p-8 rounded-[3rem] shadow-2xl group transition-all hover:border-primary/30">
                                    <div className="flex items-center gap-6 mb-6">
                                        <Avatar className="h-20 w-20 border-2 border-slate-800">
                                            <AvatarImage src={member.imageUrl} className="object-cover" />
                                            <AvatarFallback className="bg-slate-800 font-bold">{member.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{member.name}</h3>
                                            <p className="text-[10px] font-black uppercase text-primary tracking-widest">{member.role}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-400 leading-relaxed italic">"{member.bio}"</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                
                <Separator className="my-24 bg-white/5" />

                <section className="text-center bg-slate-900/40 p-12 md:p-20 rounded-[4rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                     <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                     <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight relative z-10">
                        {content?.ctaTitle || "Ga, mo mû mbage ti mo."}
                     </h2>
                     <Button size="lg" asChild className="mt-10 h-16 px-12 rounded-2xl nd-cta-primary animate-pulse relative z-10">
                         <Link href="/login?tab=register">
                            Rejoindre le mouvement
                            <ChevronsRight className="ml-2 h-5 w-5" />
                         </Link>
                     </Button>
                </section>
            </main>
        </div>
    </div>
  );
}
