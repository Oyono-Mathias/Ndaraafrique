
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Menu } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';


export default function LandingPage() {
  const router = useRouter();
  const { user, isUserLoading } = useRole();

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
    <div className="w-full min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 p-4 bg-transparent">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.svg" alt="FormaAfrique Logo" width={32} height={32} />
            <span className="font-bold text-xl text-white">FormaAfrique</span>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 justify-center px-8">
            <div className="relative w-full max-w-lg">
                <Input
                    type="search"
                    placeholder="Rechercher une compétence..."
                    className="w-full pl-10 pr-4 py-2 h-11 bg-slate-800/80 border-slate-700 rounded-full text-white placeholder:text-slate-400 focus:ring-primary focus:ring-2 focus:border-transparent"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            </div>
          </div>


          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild className="text-white hover:bg-slate-800/50 hover:text-white">
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
                        <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800/50 hover:text-white">
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
                                <Button asChild size="lg" className="w-full bg-primary text-primary-foreground rounded-full">
                                    <Link href="/login?tab=register">S'inscrire gratuitement</Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="w-full rounded-full bg-transparent border-slate-700 hover:bg-slate-800">
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
      <main className="flex-1 flex flex-col justify-center items-center text-center relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://picsum.photos/seed/africa-dev/1920/1080"
            alt="Jeunes professionnels africains apprenant en ligne"
            fill
            className="object-cover"
            priority
            data-ai-hint="young african professionals coworking"
          />
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"></div>
        </div>
        
        <div className="container mx-auto px-4 z-10">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Apprenez les compétences qui font bouger l'Afrique.
          </h1>
          <p className="max-w-3xl mx-auto mt-6 text-lg md:text-xl text-slate-300">
            Des milliers de cours en ligne créés par des experts locaux. Payez par Mobile Money, apprenez à votre rythme.
          </p>
          <div className="mt-10 flex justify-center">
            <div className="relative w-full max-w-2xl">
              <Input
                type="search"
                placeholder="Que voulez-vous apprendre aujourd'hui ?"
                className="w-full pl-12 pr-4 py-3 h-16 bg-white/10 border-slate-700 rounded-full text-lg text-white placeholder:text-slate-400 focus:ring-primary focus:ring-2 focus:border-transparent backdrop-blur-md"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

    