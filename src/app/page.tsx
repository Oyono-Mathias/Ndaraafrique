
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Menu } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/layout/language-selector';


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
      <div className="flex h-screen w-full items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 p-4 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.svg" alt="FormaAfrique Logo" width={32} height={32} />
            <span className="font-bold text-xl text-white">FormaAfrique</span>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 justify-center px-8">
            <form onSubmit={handleSearch} className="relative w-full max-w-lg">
                <Input
                    type="search"
                    placeholder="Rechercher une compétence..."
                    className="w-full pl-10 pr-4 py-2 h-11 bg-slate-800 border-slate-700 rounded-full text-white placeholder:text-slate-400 focus:ring-primary focus:ring-2 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            </form>
          </div>


          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild className="text-slate-300 hover:bg-slate-800 hover:text-white">
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-white rounded-full">
              <Link href="/login?tab=register">S'inscrire</Link>
            </Button>
          </div>
          
          {/* Mobile Navigation */}
           <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800">
                            <Menu className="h-6 w-6"/>
                            <span className="sr-only">Ouvrir le menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full max-w-sm bg-slate-900 border-l-slate-800 text-white">
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
                                <Button asChild size="lg" variant="outline" className="w-full rounded-full bg-transparent border-slate-700 hover:bg-slate-800">
                                    <Link href="/login">Se connecter</Link>
                                </Button>
                                <div className="pt-4">
                                    <LanguageSelector />
                                </div>
                            </div>
                        </nav>
                    </SheetContent>
                </Sheet>
           </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow flex items-center justify-center">
        <section className="relative py-20 md:py-32 w-full">
            <div className="absolute inset-0 z-0">
              <Image
                src="https://picsum.photos/seed/africa-learning/1920/1080"
                alt="Jeunes professionnels africains apprenant en ligne"
                fill
                className="object-cover opacity-20"
                priority
                data-ai-hint="young african professionals coworking"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/50"></div>
            </div>
            
            <div className="container mx-auto px-4 z-10 relative text-center">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white !leading-tight max-w-4xl mx-auto">
                Apprenez les compétences qui font bouger l'Afrique.
              </h1>
              <p className="max-w-3xl mx-auto mt-6 text-lg md:text-xl text-slate-300">
                Des milliers de cours en ligne créés par des experts locaux. Payez par Mobile Money, apprenez à votre rythme.
              </p>
               <div className="mt-10 flex justify-center">
                <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
                    <Input
                        type="search"
                        placeholder="Que voulez-vous apprendre aujourd'hui ?"
                        className="w-full pl-12 pr-4 py-3 h-16 bg-white/10 border-2 border-slate-700 rounded-full text-white text-lg placeholder:text-slate-400 focus:ring-primary focus:ring-2 focus:border-transparent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                     <Button type="submit" size="lg" className="absolute right-2 top-1/2 -translate-y-1/2 h-12 rounded-full bg-primary hover:bg-primary/90">
                        Rechercher
                    </Button>
                </form>
              </div>
            </div>
        </section>
      </main>
    </div>
  );
}
