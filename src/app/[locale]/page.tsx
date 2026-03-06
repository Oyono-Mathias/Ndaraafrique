'use client';

/**
 * @fileOverview Landing Page Ndara Afrique - Version 2.0 (Look Minimaliste & Fintech).
 * ✅ DESIGN : Aligné sur Udemy (Cards) et Fintech (Header fin, Typo équilibrée).
 * ✅ RESPONSIVE : Marges augmentées et tailles de titres réduites sur mobile.
 * ✅ PERF : Suppression de la section 'Dernières Publications'.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, getFirestore, where, orderBy, getDocs, doc } from 'firebase/firestore';
import Link from 'next/link';
import type { Course, NdaraUser, Settings } from '@/lib/types';
import { Footer } from '@/components/layout/footer';
import Image from 'next/image';
import { Sparkles, ChevronsRight, BookCopy, Wallet, Award, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard } from '@/components/cards/CourseCard';
import { DynamicCarousel } from '@/components/ui/DynamicCarousel';
import { useRole } from '@/context/RoleContext';
import { useDoc } from '@/firebase';
import { logTrackingEvent } from '@/actions/trackingActions';
import { useLocale } from 'next-intl';

const LandingNav = ({ logoUrl, siteName }: { logoUrl: string, siteName: string }) => {
    const [scrolled, setScrolled] = useState(false);
    const { user, role } = useRole();
    const locale = useLocale();

    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 10;
            if (isScrolled !== scrolled) setScrolled(isScrolled);
        };
        document.addEventListener('scroll', handleScroll);
        return () => document.removeEventListener('scroll', handleScroll);
    }, [scrolled]);

    const dashboardUrl = role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';

    return (
        <nav className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
            scrolled ? "py-2 bg-slate-950/95 backdrop-blur-xl border-b border-white/5 shadow-2xl" : "py-3 bg-transparent"
        )}>
            <div className="container mx-auto px-6 flex justify-between items-center">
                <Link href={`/${locale}`} className="flex items-center gap-3 group">
                    <div className="relative w-9 h-9">
                        <Image 
                            src={logoUrl} 
                            alt="Logo" 
                            width={36} 
                            height={36} 
                            className="object-contain"
                            priority
                        />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-white">Ndara Afrique</span>
                </Link>
                <div className="flex items-center gap-3">
                    <Link href={user ? `/${locale}${dashboardUrl}` : `/${locale}/login`}>
                        <Button 
                            variant="outline" 
                            className="bg-white/5 backdrop-blur-md border-white/10 text-white hover:bg-primary hover:text-white hover:border-primary h-9 px-5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            {user ? "Espace Membre" : "Se connecter"}
                        </Button>
                    </Link>
                </div>
            </div>
        </nav>
    );
};

const CourseCarousel = ({ title, courses, instructorsMap, isLoading }: { title: string, courses: Course[], instructorsMap: Map<string, Partial<NdaraUser>>, isLoading: boolean }) => {
    if (isLoading && courses.length === 0) {
        return (
            <section className="py-10">
                <Skeleton className="h-6 w-48 mb-6 rounded-full bg-slate-800" />
                <div className="flex gap-4 overflow-hidden">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="basis-[48%] sm:basis-1/3 md:basis-1/4 shrink-0 space-y-3">
                            <Skeleton className="aspect-video w-full rounded-2xl bg-slate-800" />
                            <Skeleton className="h-4 w-3/4 bg-slate-800" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }
    if (!courses || courses.length === 0) return null;

    return (
        <section className="py-10 overflow-hidden px-6">
            <h2 className="text-xl md:text-2xl font-black mb-6 text-white flex items-center gap-3 uppercase tracking-tight">
                <div className="h-6 w-1 bg-primary rounded-full shadow-[0_0_10px_hsl(var(--primary))]" />
                {title}
            </h2>
             <Carousel opts={{ align: "start", loop: false }} className="w-full">
                <CarouselContent className="-ml-4">
                    {courses.map(course => (
                        <CarouselItem key={course.id} className="pl-4 basis-[48%] sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                            <CourseCard 
                                course={course} 
                                instructor={instructorsMap.get(course.instructorId) || null} 
                                variant="grid" 
                            />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </section>
    );
};

export default function LandingPage() {
  const { user, role } = useRole();
  const db = getFirestore();
  const locale = useLocale();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());

  const dashboardUrl = role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';

  const settingsRef = doc(db, 'settings', 'global');
  const { data: settings } = useDoc<Settings>(settingsRef);
  const content = settings?.content?.landingPage;

  useEffect(() => {
    const q = query(collection(db, "courses"), where("status", "==", "Published"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(coursesData);
      if (coursesData.length > 0) {
        const instructorIds = [...new Set(coursesData.map(c => c.instructorId).filter(Boolean))];
        if (instructorIds.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', instructorIds.slice(0, 30)));
            const userSnapshots = await getDocs(usersQuery);
            const newInstructors = new Map();
            userSnapshots.forEach(doc => newInstructors.set(doc.id, doc.data()));
            setInstructorsMap(newInstructors);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db]);
  
  const logoUrl = "/logo.png";

  const coursesByCategory = useMemo(() => {
    const groups: Record<string, Course[]> = {};
    courses.forEach(course => {
      const cat = course.category || "Autres formations";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(course);
    });
    return groups;
  }, [courses]);

  return (
    <div className="bg-slate-950 text-white min-h-screen font-sans selection:bg-primary/30">
      <LandingNav logoUrl={logoUrl} siteName="Ndara Afrique" />
      
      <div className="container mx-auto">
        <header className="text-center pt-28 pb-16 md:pt-44 md:pb-24 max-w-4xl mx-auto space-y-8 px-6">
          <Badge className="bg-primary/10 text-primary border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-1000 px-5 py-2 rounded-full font-black uppercase text-[10px] tracking-[0.25em]">
            <Sparkles className="w-3 h-3 mr-2" />
            L'excellence technologique
          </Badge>
          <h1 className="text-3xl md:text-6xl font-black tracking-tighter leading-[1.15] animate-in fade-in slide-in-from-bottom-4 duration-1000 uppercase">
            {content?.heroTitle || "Le savoir est la seule richesse."}
          </h1>
          <p className="text-slate-400 text-base md:text-xl max-w-2xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {content?.heroSubtitle || "Formez-vous avec les leaders africains et propulsez votre carrière au niveau mondial."}
          </p>
          <div className="flex flex-col items-center gap-6 pt-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <Link href={user ? `/${locale}${dashboardUrl}` : `/${locale}/login?tab=register`}>
                  <button 
                    className="nd-cta-primary h-14 text-[11px] px-12 rounded-2xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 w-fit"
                    onClick={() => logTrackingEvent({ eventType: 'cta_click', sessionId: 'landing', pageUrl: '/', metadata: { location: 'hero' } })}
                  >
                      {user ? "Accéder à mon espace" : (content?.heroCtaText || "Démarrer l'aventure")}
                      <ChevronsRight className="ml-2 h-4 w-4" />
                  </button>
              </Link>
          </div>
        </header>
          
        <main className="space-y-16 md:space-y-32 pb-32">
          <div className="px-6">
            <DynamicCarousel />
          </div>

          <section className="py-16 px-6 md:py-24 md:px-12 bg-slate-900/30 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-3xl mx-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-10">
                    <h2 className="text-3xl md:text-4xl font-black leading-tight uppercase tracking-tight">Pourquoi <br/><span className="text-primary">Ndara Afrique ?</span></h2>
                    <div className="grid gap-8">
                        {[
                            { icon: BookCopy, title: "Savoir Contextualisé", desc: "Des cours pensés pour les réalités du terrain africain." },
                            { icon: Wallet, title: "Accessibilité Totale", desc: "Paiements fluides via vos services Mobile Money locaux." },
                            { icon: Award, title: "Validation Premium", desc: "Des certificats reconnus par les plus grandes entreprises." }
                        ].map((feat, i) => (
                            <div key={i} className="flex gap-5 items-start group">
                                <div className="p-4 bg-slate-800 rounded-2xl group-hover:bg-primary transition-colors duration-500 shadow-xl border border-white/5">
                                    <feat.icon className="h-6 w-6 text-primary group-hover:text-white" />
                                </div>
                                <div className="pt-1">
                                    <h3 className="font-bold text-lg text-white uppercase tracking-tight">{feat.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed mt-1.5">{feat.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-800/50 hidden lg:block">
                    <Image src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop" alt="Impact Ndara" fill className="object-cover" />
                </div>
            </div>
          </section>

          <div className="space-y-16">
              {Object.entries(coursesByCategory).map(([category, catCourses]) => (
                <CourseCarousel
                    key={category}
                    title={category}
                    courses={catCourses}
                    instructorsMap={instructorsMap}
                    isLoading={false}
                />
              ))}
          </div>

          <section className="text-center py-16 md:py-28 bg-primary rounded-[3rem] border border-white/10 relative overflow-hidden group shadow-[0_40px_80px_-20px_rgba(59,130,246,0.6)] px-8 mx-6">
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative z-10 space-y-10">
                <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-[1.1]">
                    {content?.finalCtaTitle || "Prêt à transformer votre avenir ?"}
                </h2>
                <p className="text-primary-foreground/80 text-base md:text-xl max-w-2xl mx-auto font-medium italic leading-relaxed">
                    {content?.finalCtaSubtitle || "Rejoignez la plus grande académie panafricaine dès aujourd'hui."}
                </p>
                <Button 
                    size="lg" 
                    asChild 
                    className="h-16 px-12 rounded-2xl bg-white text-primary hover:bg-slate-50 font-black uppercase text-[11px] tracking-[0.25em] shadow-2xl transition-all active:scale-95 w-fit mx-auto flex"
                    onClick={() => logTrackingEvent({ eventType: 'cta_click', sessionId: 'landing', pageUrl: '/', metadata: { location: 'footer' } })}
                >
                    <Link href={user ? `/${locale}${dashboardUrl}` : `/${locale}/login?tab=register`}>
                        {user ? "Accéder au dashboard" : (content?.finalCtaButtonText || "Devenir Membre")}
                        <ChevronsRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </div>
  );
}
