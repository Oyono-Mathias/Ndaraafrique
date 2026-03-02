'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ChevronsRight } from 'lucide-react';
import Link from 'next/link';
import { useDoc } from '@/firebase';
import { useMemo } from 'react';
import { doc, getFirestore } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { Settings, TeamMember as TeamMemberType } from '@/lib/types';

/**
 * @fileOverview Page "À Propos" - Manifeste Ndara Afrique.
 */

const SangoQuote = ({ children }: { children: React.ReactNode }) => (
    <blockquote className="relative text-center my-12 md:my-16">
        <p className="text-2xl md:text-4xl font-bold text-white italic" style={{ textShadow: '0 0 10px hsl(var(--primary)/0.5)' }}>
            "{children}"
        </p>
    </blockquote>
);

const Section = ({ title, frenchText, sangoText, children }: { title: string, frenchText?: string, sangoText?: string, children?: React.ReactNode }) => (
    <section className="mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 border-l-4 border-primary pl-4 uppercase tracking-tighter">{title}</h2>
        {frenchText && sangoText && (
            <div className="prose prose-lg prose-invert max-w-none text-slate-300">
                <p>{frenchText}</p>
                <p className="text-slate-400 italic text-base">{sangoText}</p>
            </div>
        )}
        {children}
    </section>
);

const TeamMember = ({ name, role, imageUrl, bio }: TeamMemberType) => (
    <div className="text-center group">
        <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-slate-700 transition-all duration-500 group-hover:border-primary group-hover:scale-105 shadow-2xl">
            <AvatarImage src={imageUrl} alt={name} className="grayscale group-hover:grayscale-0 transition-all" />
            <AvatarFallback className="bg-slate-800 text-3xl font-black">{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <h3 className="font-bold text-xl text-white group-hover:text-primary transition-colors">{name}</h3>
        <p className="text-primary font-black uppercase text-[10px] tracking-widest mt-1">{role}</p>
        <p className="text-slate-400 text-sm mt-3 max-w-xs mx-auto leading-relaxed">{bio}</p>
    </div>
);

export default function AboutPage() {
  const db = getFirestore();
  const settingsRef = useMemo(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings, isLoading } = useDoc<Settings>(settingsRef);

  const content = settings?.content?.aboutPage;
  
  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 p-16 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden bg-grainy">
        <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
            <header className="text-center mb-16 md:mb-24 animate-in fade-in slide-in-from-top-4 duration-1000">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase">
                    {content?.mainTitle || "Le Manifeste Ndara"}
                </h1>
                <p className="mt-4 text-lg md:text-xl text-slate-400 max-w-3xl mx-auto font-medium italic">
                    {content?.mainSubtitle || "Mouvement pour l'émancipation technologique du continent."}
                </p>
            </header>

            <main className="max-w-4xl mx-auto">
                <Section
                    title={content?.historyTitle || "Notre Histoire"}
                    frenchText={content?.historyFrench || "Ndara Afrique est né d'une conviction profonde : le savoir est le levier le plus puissant pour le changement."}
                    sangoText={content?.historySango || "Ndara ayeke kpengba lege ti changement."}
                />

                <SangoQuote>Bara ala, Tonga na ndara.</SangoQuote>
                
                <Section
                    title={content?.visionTitle || "Notre Vision"}
                    frenchText={content?.visionFrench || "Faire de l'Afrique un créateur de technologie de premier plan."}
                    sangoText={content?.visionSango || "Vision ti e ayeke ti tene Afrique aga mbeni kota zo ti technologie."}
                />
                
                <Separator className="my-24 bg-slate-800" />

                <section className="text-center bg-slate-900/40 p-12 rounded-[3rem] border border-white/5 shadow-2xl">
                     <h2 className="text-3xl font-black text-white uppercase tracking-tight">{content?.ctaTitle || "Ga, mo mû mbage ti mo."}</h2>
                     <Button size="lg" asChild className="mt-10 h-16 px-12 rounded-2xl nd-cta-primary animate-pulse">
                         <Link href="/login?tab=register">
                            Devenir Membre
                            <ChevronsRight className="ml-2 h-5 w-5" />
                         </Link>
                     </Button>
                </section>
            </main>
        </div>
    </div>
  );
}

import { Loader2 } from 'lucide-react';
