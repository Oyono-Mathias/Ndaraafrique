
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Menu, Zap, Users, BookOpen } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/layout/language-selector';


export default function LandingPage() {
  const router = useRouter();
  const { user, isUserLoading } = useRole();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 p-4 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.svg" alt="FormaAfrique Logo" width={32} height={32} />
            <span className="font-bold text-xl text-primary">FormaAfrique</span>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 justify-center px-8">
            <div className="relative w-full max-w-lg">
                <Input
                    type="search"
                    placeholder="Rechercher une compétence..."
                    className="w-full pl-10 pr-4 py-2 h-11 bg-slate-100 border-slate-300 rounded-full text-slate-900 placeholder:text-slate-500 focus:ring-primary focus:ring-2 focus:border-transparent"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            </div>
          </div>


          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild className="text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
              <Link href="/login?tab=register">S'inscrire</Link>
            </Button>
          </div>
          
          {/* Mobile Navigation */}
           <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-800 hover:bg-slate-100">
                            <Menu className="h-6 w-6"/>
                            <span className="sr-only">Ouvrir le menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full max-w-sm bg-white border-l-slate-200 text-slate-900">
                        <nav className="flex flex-col h-full p-4">
                            <div className="flex flex-col gap-4 text-lg font-medium mt-8">
                                <Link href="/search" className="hover:text-primary">Tous les cours</Link>
                                <Link href="/devenir-instructeur" className="hover:text-primary">Devenir Formateur</Link>
                                <Link href="/tutor" className="hover:text-primary">Tuteur IA</Link>
                            </div>
                            <div className="mt-auto space-y-4">
                                <Button asChild size="lg" className="w-full bg-primary text-primary-foreground rounded-full">
                                    <Link href="/login?tab=register">S'inscrire gratuitement</Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="w-full rounded-full bg-transparent border-slate-300 hover:bg-slate-100">
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
      <main className="flex-grow">
        <section className="relative py-20 md:py-32 bg-slate-900 text-white overflow-hidden">
            <div className="absolute inset-0 z-0">
              <Image
                src="https://picsum.photos/seed/africa-dev/1920/1080"
                alt="Jeunes professionnels africains apprenant en ligne"
                fill
                className="object-cover opacity-30"
                priority
                data-ai-hint="young african professionals coworking"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/50"></div>
            </div>
            
            <div className="container mx-auto px-4 z-10 relative text-center">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white !leading-tight">
                Apprenez les compétences qui font bouger l'Afrique.
              </h1>
              <p className="max-w-3xl mx-auto mt-6 text-lg md:text-xl text-slate-300">
                Des milliers de cours en ligne créés par des experts locaux. Payez par Mobile Money, apprenez à votre rythme.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="h-14 text-lg w-full sm:w-auto rounded-full bg-primary hover:bg-primary/90">
                    <Link href="/login?tab=register">Commencer maintenant</Link>
                </Button>
                 <Button size="lg" variant="outline" className="h-14 text-lg w-full sm:w-auto rounded-full border-slate-600 bg-slate-800/50 hover:bg-slate-800">
                    <Link href="/search">Explorer les cours</Link>
                </Button>
              </div>
            </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-white">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="text-center p-10 bg-slate-50 rounded-xl shadow-sm">
                        <Zap className="h-10 w-10 mx-auto text-primary mb-4" />
                        <h3 className="text-xl font-bold mb-2">Apprentissage Accéléré</h3>
                        <p className="text-slate-600">Des formations intensives et pratiques pour maîtriser rapidement de nouvelles compétences.</p>
                    </div>
                    <div className="text-center p-10 bg-slate-50 rounded-xl shadow-sm">
                        <Users className="h-10 w-10 mx-auto text-primary mb-4" />
                        <h3 className="text-xl font-bold mb-2">Experts Locaux</h3>
                        <p className="text-slate-600">Apprenez auprès des meilleurs professionnels du continent, adaptés à votre contexte.</p>
                    </div>
                    <div className="text-center p-10 bg-slate-50 rounded-xl shadow-sm">
                        <BookOpen className="h-10 w-10 mx-auto text-primary mb-4" />
                        <h3 className="text-xl font-bold mb-2">Catalogue Riche</h3>
                        <p className="text-slate-600">Du code au marketing digital, trouvez le cours parfait pour votre carrière.</p>
                    </div>
                </div>
            </div>
        </section>
      </main>
    </div>
  );
}
