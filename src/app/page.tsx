
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Menu, Star, BookOpen, Users, Award, Briefcase, ChevronRight, Frown, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useEffect, useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/layout/language-selector';
import { Footer } from '@/components/layout/footer';
import { getFirestore, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import type { Course } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { Skeleton } from '@/components/ui/skeleton';

const CourseCard = ({ course, instructor }: { course: Course, instructor: Partial<FormaAfriqueUser> | null }) => (
  <div className="bg-white dark:bg-slate-800/50 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-shadow duration-300">
    <Link href={`/course/${course.id}`} className="block">
      <Image src={course.imageUrl || `https://picsum.photos/seed/${course.id}/300/170`} alt={course.title} width={300} height={170} className="w-full aspect-video object-cover" />
      <div className="p-4">
        <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 line-clamp-2 h-12">{course.title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{instructor?.fullName || 'Instructeur FormaAfrique'}</p>
        <div className="flex items-center gap-1 mt-2">
          <span className="font-bold text-sm text-amber-500">4.8</span>
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-xs text-slate-400">({(Math.random() * 2000 + 50).toFixed(0)})</span>
        </div>
        <p className="font-extrabold text-lg text-slate-900 dark:text-white mt-2">
          {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} FCFA` : 'Gratuit'}
        </p>
      </div>
    </Link>
  </div>
);

export default function LandingPage() {
  const router = useRouter();
  const { user, isUserLoading } = useRole();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 dark:bg-[#020617] text-slate-800 dark:text-white flex flex-col">
      <header className="sticky top-0 z-50 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.svg" alt="FormaAfrique Logo" width={32} height={32} />
            <span className="font-bold text-xl text-slate-900 dark:text-white">FormaAfrique</span>
          </Link>
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
              <Link href="/login?tab=register">S'inscrire</Link>
            </Button>
          </div>
           <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
                            <Menu className="h-6 w-6"/>
                            <span className="sr-only">Ouvrir le menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full max-w-sm bg-white dark:bg-slate-900 border-l-slate-200 dark:border-l-slate-800 text-slate-900 dark:text-white">
                        <nav className="flex flex-col h-full p-4">
                            <div className="flex flex-col gap-4 text-lg font-medium mt-8">
                                <Link href="/search" className="hover:text-primary">Tous les cours</Link>
                                <Link href="/devenir-instructeur" className="hover:text-primary">Devenir Formateur</Link>
                                <Link href="/tutor" className="hover:text-primary">Tuteur IA</Link>
                            </div>
                            <div className="mt-auto space-y-4">
                                <Button asChild size="lg" className="w-full bg-primary text-white rounded-full">
                                    <Link href="/login?tab=register">S'inscrire gratuitement</Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="w-full rounded-full bg-transparent border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <Link href="/login">Se connecter</Link>
                                </Button>
                            </div>
                        </nav>
                    </SheetContent>
                </Sheet>
           </div>
        </div>
      </header>
      <main className="flex-grow">
        <section className="relative pt-20 pb-28 md:pt-32 md:pb-40 w-full bg-slate-100 dark:bg-slate-900/50">
            <div className="container mx-auto px-4 z-10 relative text-center">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white !leading-tight max-w-4xl mx-auto">
                Apprenez les compétences qui font bouger l'Afrique.
              </h1>
              <p className="max-w-3xl mx-auto mt-6 text-lg md:text-xl text-slate-600 dark:text-slate-300">
                Des milliers de cours en ligne créés par des experts locaux. Payez par Mobile Money, apprenez à votre rythme.
              </p>
               <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button size="lg" asChild className="h-12 text-base w-full sm:w-auto bg-primary hover:bg-primary/90">
                    <Link href="/login?tab=register">Créer un compte gratuitement</Link>
                  </Button>
                   <Button size="lg" asChild variant="outline" className="h-12 text-base w-full sm:w-auto bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                    <Link href="/search">Parcourir le catalogue</Link>
                  </Button>
              </div>
            </div>
        </section>
        
        <section className="py-16 md:py-24 text-center">
            <h2 className="text-3xl font-bold text-center mb-4 text-slate-900 dark:text-white">Un large catalogue de formations</h2>
            <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-400 mb-8">
                Pour voir l'ensemble de nos formations, il vous suffit de créer un compte. L'inscription est gratuite et rapide.
            </p>
            <Button asChild size="lg" className="h-12 text-base">
                 <Link href="/login?tab=register">Inscrivez-vous pour voir nos formations</Link>
            </Button>
        </section>

        <section className="py-16 md:py-24 bg-slate-100 dark:bg-slate-900/50">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-3 gap-10 text-center">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4"><BookOpen className="h-8 w-8 text-primary" /></div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Apprenez à votre rythme</h3>
                        <p className="text-slate-600 dark:text-slate-400 mt-2">Suivez les cours depuis n'importe quel appareil, sans contrainte de temps.</p>
                    </div>
                    <div className="flex flex-col items-center">
                         <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4"><Users className="h-8 w-8 text-primary" /></div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Experts locaux</h3>
                        <p className="text-slate-600 dark:text-slate-400 mt-2">Nos formations sont créées par des professionnels africains pour le marché africain.</p>
                    </div>
                    <div className="flex flex-col items-center">
                         <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4"><Award className="h-8 w-8 text-primary" /></div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Certificats reconnus</h3>
                        <p className="text-slate-600 dark:text-slate-400 mt-2">Validez vos compétences avec une certification à la fin de chaque formation.</p>
                    </div>
                </div>
            </div>
        </section>
        <section className="py-16 md:py-24">
             <div className="container mx-auto px-4 text-center">
                <div className="bg-slate-100 dark:bg-slate-800/50 p-10 rounded-2xl flex flex-col items-center">
                    <Briefcase className="h-10 w-10 text-primary mb-4" />
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Devenez Formateur</h2>
                    <p className="max-w-2xl mx-auto mt-4 text-slate-600 dark:text-slate-300">
                        Partagez votre expertise, créez un impact et générez des revenus en formant les talents de demain.
                    </p>
                    <Button size="lg" asChild className="mt-8 h-12 text-base">
                        <Link href="/devenir-instructeur">Enseigner sur FormaAfrique <ChevronRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </div>
            </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

    