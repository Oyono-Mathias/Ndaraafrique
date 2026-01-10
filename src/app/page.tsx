'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Menu, Star, BookOpen, Users, Award, Briefcase, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/layout/language-selector';
import { Footer } from '@/components/layout/footer';

const CourseCard = ({ title, instructor, rating, reviews, price, imageUrl, id }: any) => (
  <div className="bg-white dark:bg-slate-800/50 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-shadow duration-300">
    <Link href={`/course/${id}`} className="block">
      <Image src={imageUrl} alt={title} width={300} height={170} className="w-full aspect-video object-cover" />
      <div className="p-4">
        <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 line-clamp-2 h-12">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{instructor}</p>
        <div className="flex items-center gap-1 mt-2">
          <span className="font-bold text-sm text-amber-500">{rating}</span>
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-xs text-slate-400">({reviews})</span>
        </div>
        <p className="font-extrabold text-lg text-slate-900 dark:text-white mt-2">{price}</p>
      </div>
    </Link>
  </div>
);

const dummyCourses = [
    { id: '1', title: 'Marketing Digital de A à Z pour Entrepreneurs Africains', instructor: 'Fatima Ouattara', rating: 4.8, reviews: '1,2k', price: '35 000 FCFA', imageUrl: 'https://picsum.photos/seed/course1/300/170', "data-ai-hint": "digital marketing" },
    { id: '2', title: 'Développement Web Full-Stack avec React et Node.js', instructor: 'Kwame N\'Krumah', rating: 4.9, reviews: '3,4k', price: '45 000 FCFA', imageUrl: 'https://picsum.photos/seed/course2/300/170', "data-ai-hint": "web development" },
    { id: '3', title: 'Maîtriser le Design UI/UX avec Figma pour le Marché Mobile', instructor: 'Aïcha Traoré', rating: 4.7, reviews: '890', price: '30 000 FCFA', imageUrl: 'https://picsum.photos/seed/course3/300/170', "data-ai-hint": "ui ux design" },
    { id: '4', title: 'Gestion de Projet Agile : Devenez un Scrum Master Certifié', instructor: 'David Okoro', rating: 4.8, reviews: '2.1k', price: '40 000 FCFA', imageUrl: 'https://picsum.photos/seed/course4/300/170', "data-ai-hint": "project management" },
    { id: '5', title: 'Introduction à l\'Intelligence Artificielle et Machine Learning', instructor: 'Dr. Ifeoma Adebayo', rating: 4.9, reviews: '4.5k', price: '60 000 FCFA', imageUrl: 'https://picsum.photos/seed/course5/300/170', "data-ai-hint": "artificial intelligence" },
    { id: '6', title: 'Analyse de Données avec Python : De Débutant à Expert', instructor: 'Samira Dione', rating: 4.7, reviews: '1.8k', price: '45 000 FCFA', imageUrl: 'https://picsum.photos/seed/course6/300/170', "data-ai-hint": "data analysis" },
    { id: '7', title: 'E-commerce : Lancer sa Boutique en Ligne avec Shopify', instructor: 'Moussa Diop', rating: 4.6, reviews: '950', price: '25 000 FCFA', imageUrl: 'https://picsum.photos/seed/course7/300/170', "data-ai-hint": "ecommerce" },
    { id: '8', title: 'Devenir un Pro du Montage Vidéo avec Adobe Premiere Pro', instructor: 'Daniel Adekunle', rating: 4.8, reviews: '2.2k', price: '35 000 FCFA', imageUrl: 'https://picsum.photos/seed/course8/300/170', "data-ai-hint": "video editing" },
];


export default function LandingPage() {
  const router = useRouter();
  const { user, isUserLoading } = useRole();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

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
      {/* Header */}
       <header className="sticky top-0 z-50 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.svg" alt="FormaAfrique Logo" width={32} height={32} />
            <span className="font-bold text-xl text-slate-900 dark:text-white">FormaAfrique</span>
          </Link>

          <div className="hidden md:flex flex-1 justify-center px-8">
            <form onSubmit={handleSearch} className="relative w-full max-w-lg">
                <Input
                    type="search"
                    placeholder="Que voulez-vous apprendre aujourd'hui ?"
                    className="w-full pl-10 pr-4 py-2 h-11 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-full text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-primary focus:ring-2 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            </form>
          </div>

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

      {/* Hero Section */}
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

        {/* Courses Showcase */}
        <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
                 <h2 className="text-3xl font-bold text-center mb-10 text-slate-900 dark:text-white">Une sélection de cours pour démarrer</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {dummyCourses.slice(0,8).map(course => <CourseCard key={course.id} {...course} />)}
                </div>
            </div>
        </section>

        {/* Value Proposition */}
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

        {/* Instructor CTA */}
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
