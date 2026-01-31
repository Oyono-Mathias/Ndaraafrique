
'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ChevronsRight } from 'lucide-react';
import { Link } from 'next-intl/navigation';
import { useDoc } from '@/firebase';
import { useMemo } from 'react';
import { doc, getFirestore } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { Settings } from '@/lib/types';

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

const TeamMember = ({ name, role, imageUrl, bio }: { name: string, role: string, imageUrl: string, bio: string }) => (
    <div className="text-center">
        <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-slate-700">
            <AvatarImage src={imageUrl} alt={name} className="grayscale" />
            <AvatarFallback className="bg-slate-800 text-3xl">{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <h3 className="font-bold text-xl text-white">{name}</h3>
        <p className="text-primary font-semibold">{role}</p>
        <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">{bio}</p>
    </div>
);


export default function AboutPage() {
  const db = getFirestore();
  const settingsRef = useMemo(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings, isLoading } = useDoc<Settings>(settingsRef);

  const content = settings?.content?.aboutPage;
  
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
    <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden">
        {/* Subtle background pattern */}
        <div 
            className="absolute inset-0 z-0 opacity-[0.03]"
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
        />
        
        <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
            <header className="text-center mb-16 md:mb-24">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white">
                    {content?.mainTitle || "Le Manifeste Ndara"}
                </h1>
                <p className="mt-4 text-lg md:text-xl text-slate-400 max-w-3xl mx-auto">
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
                
                <Section title="L'Équipe Fondatrice">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 mt-8">
                        <TeamMember 
                            name="Mathias Oyono" 
                            role="CEO & Visionnaire"
                            imageUrl="/placeholder-avatars/mathias.jpg" 
                            bio="Passionné par l'éducation et la technologie, Mathias rêve d'une Afrique leader de l'innovation."
                        />
                         <TeamMember 
                            name="Amina Diallo" 
                            role="Directrice Pédagogique"
                            imageUrl="/placeholder-avatars/amina.jpg" 
                            bio="Experte en ingénierie pédagogique, Amina s'assure que chaque cours est une expérience d'apprentissage exceptionnelle."
                        />
                         <TeamMember 
                            name="Kwame Nkrumah" 
                            role="Responsable Technologique"
                            imageUrl="/placeholder-avatars/kwame.jpg" 
                            bio="Architecte de la plateforme, Kwame est obsédé par la création d'une expérience utilisateur fluide et robuste."
                        />
                    </div>
                </Section>
                
                <Separator className="my-16 bg-slate-700" />

                <section className="text-center">
                     <h2 className="text-3xl font-bold text-white">{content?.ctaTitle || "Ga, mo mû mbage ti mo."}</h2>
                     <p className="mt-2 text-slate-400">{content?.ctaSubtitle || "Rejoignez des milliers d'apprenants et de formateurs qui construisent le futur."}</p>
                     <Button size="lg" asChild className="mt-6 h-14 text-lg animate-pulse">
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
