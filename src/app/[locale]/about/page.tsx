'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ChevronsRight, Users as UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { useDoc } from '@/firebase';
import { useMemo } from 'react';
import { doc, getFirestore } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { Settings, TeamMember as TeamMemberType } from '@/lib/types';

const SangoQuote = ({ children }: { children: React.ReactNode }) => {
    return (
        <blockquote className="relative text-center my-12 md:my-16">
            <p 
                className="text-2xl md:text-4xl font-bold text-white italic"
                style={{ textShadow: '0 0 5px hsl(var(--primary)), 0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary)/0.8)' }}
            >
                "{children}"
            </p>
        </blockquote>
    );
};

const Section = ({ title, frenchText, sangoText, children }: { title: string, frenchText?: string, sangoText?: string, children?: React.ReactNode }) => (
    <section className="mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 border-l-4 border-primary pl-4">{title}</h2>
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
        <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-slate-700 transition-all duration-500 group-hover:border-primary group-hover:scale-105">
            <AvatarImage src={imageUrl} alt={name} className="grayscale group-hover:grayscale-0 transition-all" />
            <AvatarFallback className="bg-slate-800 text-3xl font-black">{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <h3 className="font-bold text-xl text-white group-hover:text-primary transition-colors">{name}</h3>
        <p className="text-primary font-black uppercase text-[10px] tracking-widest mt-1">{role}</p>
        <p className="text-slate-400 text-sm mt-3 max-w-xs mx-auto leading-relaxed">{bio}</p>
    </div>
);

const defaultTeam: TeamMemberType[] = [
    { 
        name: "Mathias Oyono", 
        role: "CEO & Visionnaire",
        imageUrl: "/placeholder-avatars/mathias.jpg", 
        bio: "Passionné par l'éducation et la technologie, Mathias rêve d'une Afrique leader de l'innovation."
    },
    { 
        name: "Amina Diallo", 
        role: "Directrice Pédagogique",
        imageUrl: "/placeholder-avatars/amina.jpg", 
        bio: "Experte en ingénierie pédagogique, Amina s'assure que chaque cours est une expérience d'apprentissage exceptionnelle."
    },
    { 
        name: "Kwame Nkrumah", 
        role: "Responsable Technologique",
        imageUrl: "/placeholder-avatars/kwame.jpg", 
        bio: "Architecte de la plateforme, Kwame est obsédé par la création d'une expérience utilisateur fluide et robuste."
    }
];

export default function AboutPage() {
  const db = getFirestore();
  const settingsRef = useMemo(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings, isLoading } = useDoc<Settings>(settingsRef);

  const content = settings?.content?.aboutPage;
  const teamMembers = content?.teamMembers && content.teamMembers.length > 0 
    ? content.teamMembers 
    : defaultTeam;
  
  if (isLoading) {
    return (
        <div className="min-h-screen bg-slate-900 text-white p-16">
             <header className="text-center mb-16 md:mb-24">
                <Skeleton className="h-14 w-3/4 mx-auto" />
                <Skeleton className="h-6 w-1/2 mx-auto mt-4" />
            </header>
             <main className="max-w-4xl mx-auto">
                <Skeleton className="h-40 w-full mb-16" />
                <Skeleton className="h-10 w-full mb-16" />
                <Skeleton className="h-40 w-full mb-16" />
             </main>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden bg-grainy">
        {/* Subtle background pattern */}
        <div 
            className="absolute inset-0 z-0 opacity-[0.03]"
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
        />
        
        <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
            <header className="text-center mb-16 md:mb-24 animate-in fade-in slide-in-from-top-4 duration-1000">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase">
                    {content?.mainTitle || "Le Manifeste Ndara"}
                </h1>
                <p className="mt-4 text-lg md:text-xl text-slate-400 max-w-3xl mx-auto font-medium italic">
                    {content?.mainSubtitle || "Plus qu'une plateforme. Un mouvement pour l'émancipation technologique du continent."}
                </p>
            </header>

            <main className="max-w-4xl mx-auto">
                <Section
                    title={content?.historyTitle || "Notre Histoire"}
                    frenchText={content?.historyFrench || "Ndara Afrique est né d'une conviction profonde : le savoir est le levier le plus puissant pour le changement. Face à un continent en pleine mutation, nous avons vu un besoin urgent de formations accessibles, pertinentes et créées par des experts locaux pour des talents locaux."}
                    sangoText={content?.historySango || "Tene ti Ndara Afrique a lîngbi na ndö ti mbeni kpengba pensé: Ndara ayeke kpengba lege ti changement. Na lê ti mbeni kontinän so ayeke changé, e bâ so a yeke kota ye ti wara afango ye so alingbi na azo, so a leke ni na lege ti azo ti kodoro ndali ti azo ti kodoro."}
                />

                <SangoQuote>Bara ala, Tonga na ndara.</SangoQuote>
                
                <Section
                    title={content?.visionTitle || "Notre Vision"}
                    frenchText={content?.visionFrench || "Notre ambition est de faire de l'Afrique non plus un consommateur, mais un créateur de technologie de premier plan. Nous bâtissons un écosystème où chaque jeune talent a les outils pour innover, pour construire les solutions de demain, et pour devenir un leader dans l'économie numérique mondiale."}
                    sangoText={content?.visionSango || "Vision ti e ayeke ti tene que Afrique aga pëpe mbeni zo so ayeke vo ye senge, me mbeni kota zo so ayeke leke aye ti technologie. E yeke leke mbeni lege so na yâ ni, amaseka kue so ayeke na ndara awara aye so alingbi ti tene ala leke aye ti kekereke, na ala ga akozo zo na yâ ti économie numérique ti dunia."}
                />
                
                <Section title="L'Équipe">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 mt-12">
                        {teamMembers.map((member, index) => (
                            <TeamMember 
                                key={index}
                                {...member}
                            />
                        ))}
                    </div>
                </Section>
                
                <Separator className="my-24 bg-slate-800" />

                <section className="text-center bg-slate-900/40 p-12 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                     <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                     <h2 className="text-3xl font-black text-white uppercase tracking-tight relative z-10">{content?.ctaTitle || "Ga, mo mû mbage ti mo."}</h2>
                     <p className="mt-4 text-slate-400 max-w-xl mx-auto font-medium relative z-10">{content?.ctaSubtitle || "Rejoignez des milliers d'apprenants et de formateurs qui construisent le futur de l'Afrique avec Ndara."}</p>
                     <Button size="lg" asChild className="mt-10 h-16 px-12 rounded-2xl nd-cta-primary animate-pulse relative z-10">
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
