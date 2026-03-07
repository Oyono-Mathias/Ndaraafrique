
'use client';

/**
 * @fileOverview Landing Page Ndara Afrique - Version Optimisée Performance.
 * ✅ PERFORMANCE : next/image avec priority et sizes pour un LCP record.
 * ✅ LAZY LOADING : Composants secondaires chargés de manière différée.
 */

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { collection, query, onSnapshot, getFirestore, where, orderBy, getDocs, doc } from 'firebase/firestore';
import Link from 'next/link';
import type { Course, NdaraUser, Settings } from '@/lib/types';
import Image from 'next/image';
import { ChevronsRight, Menu, X, PlayCircle, BadgeEuro, LayoutDashboard, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/cards/CourseCard';
import { useRole } from '@/context/RoleContext';
import { useLocale } from 'next-intl';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useDoc } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Chargement dynamique des composants lourds ou sous la ligne de flottaison
const Stats = dynamic(() => import('@/components/landing/Stats').then(mod => mod.Stats), { ssr: false });
const TestimonialsSection = dynamic(() => import('@/components/landing/TestimonialsSection').then(mod => mod.TestimonialsSection), { ssr: false });
const RecommendedCourses = dynamic(() => import('@/components/dashboards/RecommendedCourses').then(mod => mod.RecommendedCourses), { ssr: false });
const Footer = dynamic(() => import('@/components/layout/footer').then(mod => mod.Footer), { ssr: false });

const Navbar = () => {
    const { user, currentUser, role } = useRole();
    const locale = useLocale();
    
    const dashboardUrl = useMemo(() => {
        if (role === 'admin') return '/admin';
        if (role === 'instructor') return '/instructor/dashboard';
        return '/student/dashboard';
    }, [role]);

    return (
        <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200 h-16 md:h-20 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex justify-between items-center">
                <Link href={`/${locale}`} className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center text-white font-bold shadow-lg">N</div>
                    <span className="text-lg md:text-xl font-black text-brand-dark tracking-tighter uppercase">Ndara <span className="text-brand-primary">Afrique</span></span>
                </Link>
                
                <div className="hidden md:flex space-x-8 items-center">
                    <a href="#formations" className="text-slate-600 hover:text-brand-primary font-bold transition uppercase tracking-widest text-[10px]">Formations</a>
                    <Link href={`/${locale}/investir`} className="flex items-center gap-1.5 text-slate-600 hover:text-amber-600 font-black transition uppercase tracking-widest text-[10px]">
                        <BadgeEuro className="h-3.5 w-3.5 text-amber-500" />
                        Bourse du Savoir
                    </Link>
                    <Link href={`/${locale}/abonnements`} className="text-slate-600 hover:text-brand-primary font-bold transition uppercase tracking-widest text-[10px]">Tarifs</Link>
                </div>

                <div className="hidden md:flex items-center space-x-4">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <Link href={`/${locale}${dashboardUrl}`} className="text-brand-dark font-black uppercase text-[10px] tracking-widest hover:text-brand-primary transition bg-slate-100 px-4 py-2 rounded-full flex items-center gap-2">
                                <LayoutDashboard className="w-3.5 h-3.5" />
                                Mon Espace
                            </Link>
                            <Avatar className="h-10 w-10 border-2 border-brand-primary/20 shadow-sm">
                                <AvatarImage src={currentUser?.profilePictureURL} className="object-cover" />
                                <AvatarFallback className="bg-slate-100 text-brand-dark font-bold">{currentUser?.fullName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                    ) : (
                        <>
                            <Link href={`/${locale}/login`} className="text-[10px] font-black uppercase tracking-widest text-brand-dark hover:text-brand-primary transition">
                                Connexion
                            </Link>
                            <Link href={`/${locale}/login?tab=register`} className="bg-brand-dark text-white px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-lg shadow-brand-dark/20 active:scale-95">
                                S'inscrire
                            </Link>
                        </>
                    )}
                </div>

                <div className="md:hidden flex items-center gap-3">
                    {!user && (
                        <Link href={`/${locale}/login`} className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Connexion</Link>
                    )}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-600 h-10 w-10 rounded-full bg-slate-50">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="bg-white border-l-0 p-0 w-[85%] z-[10005]">
                            <div className="p-8 flex flex-col gap-8 h-full bg-grainy">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center text-white font-bold">N</div>
                                        <span className="text-xl font-black text-brand-dark uppercase tracking-tighter">Ndara</span>
                                    </div>
                                    <SheetClose asChild>
                                        <Button variant="ghost" size="icon" className="rounded-full bg-slate-100"><X className="h-5 w-5" /></Button>
                                    </SheetClose>
                                </div>
                                <div className="flex flex-col gap-2 mt-4">
                                    <SheetClose asChild>
                                        <Link href={`/${locale}/search`} className="text-lg font-black uppercase tracking-tight text-slate-800 p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                                            Explorer les cours
                                            <ChevronsRight className="h-5 w-5 text-slate-300" />
                                        </Link>
                                    </SheetClose>
                                    <SheetClose asChild>
                                        <Link href={`/${locale}/investir`} className="text-lg font-black uppercase tracking-tight text-amber-600 p-4 bg-amber-100/50 rounded-2xl flex items-center justify-between border border-amber-100">
                                            <span className="flex items-center gap-3">
                                                <BadgeEuro className="h-6 w-6" />
                                                Bourse du Savoir
                                            </span>
                                            <ChevronsRight className="h-5 w-5" />
                                        </Link>
                                    </SheetClose>
                                    <SheetClose asChild>
                                        <Link href={`/${locale}/abonnements`} className="text-lg font-black uppercase tracking-tight text-slate-800 p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                                            Nos Tarifs
                                            <ChevronsRight className="h-5 w-5 text-slate-300" />
                                        </Link>
                                    </SheetClose>
                                </div>

                                <div className="mt-auto space-y-4">
                                    {user ? (
                                        <SheetClose asChild>
                                            <Link href={`/${locale}${dashboardUrl}`} className="w-full h-16 bg-brand-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center shadow-xl shadow-emerald-500/20">
                                                Accéder à mon espace
                                            </Link>
                                        </SheetClose>
                                    ) : (
                                        <SheetClose asChild>
                                            <Link href={`/${locale}/login?tab=register`} className="w-full h-16 bg-brand-dark text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center shadow-xl shadow-brand-dark/20">
                                                Créer mon compte
                                            </Link>
                                        </SheetClose>
                                    )}
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </nav>
    );
};

export default function LandingPage() {
  const db = getFirestore();
  const locale = useLocale();
  const { user, currentUser, role } = useRole();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());

  const settingsRef = useMemo(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings } = useDoc<Settings>(settingsRef);
  const landingPageSettings = settings?.content?.landingPage;

  const dashboardUrl = useMemo(() => {
    if (role === 'admin') return '/admin';
    if (role === 'instructor') return '/instructor/dashboard';
    return '/student/dashboard';
  }, [role]);

  useEffect(() => {
    const q = query(collection(db, "courses"), where("status", "==", "Published"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        setCourses(coursesData);
        
        if (coursesData.length > 0) {
          const instructorIds = [...new Set(coursesData.map(c => c.instructorId).filter(Boolean))];
          const instructorsRef = collection(db, 'users');
          const newMap = new Map();
          
          for (let i = 0; i < instructorIds.length; i += 30) {
              const chunk = instructorIds.slice(i, i + 30);
              if (chunk.length === 0) continue;
              const qInst = query(instructorsRef, where('uid', 'in', chunk));
              const snap = await getDocs(qInst);
              snap.forEach(d => newMap.set(d.id, d.data()));
          }
          setInstructorsMap(newMap);
        }
      } catch (err) {
        console.warn("LandingPage Course Load Warning:", err);
      } finally {
        setLoading(false);
      }
    }, (error) => {
        console.error("Firestore Landing error:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  const displayCourses = useMemo(() => {
    return courses.slice(0, 6);
  }, [courses]);

  return (
    <div className="bg-white text-slate-800 antialiased overflow-x-hidden selection:bg-brand-primary/30 font-sans">
      <Navbar />
      
      {/* --- HERO SECTION --- */}
      <section className="relative pt-24 pb-16 md:pt-48 md:pb-32 overflow-hidden px-4 md:px-6">
        <div className="absolute inset-0 z-0">
            <div className="absolute top-0 right-0 w-full md:w-1/2 h-full bg-gradient-to-l from-emerald-50/50 to-transparent opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-full md:w-1/3 h-1/2 bg-gradient-to-t from-blue-50/50 to-transparent opacity-50"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="text-center lg:text-left animate-fade-in-up px-2">
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-6">
                        <span className="w-2 h-2 rounded-full bg-brand-primary mr-2 animate-pulse"></span>
                        {user ? `Bara ala, ${currentUser?.fullName?.split(' ')[0]} !` : "L'excellence africaine par le savoir"}
                    </div>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-brand-dark leading-[1.1] mb-6 uppercase tracking-tighter">
                        {landingPageSettings?.heroTitle || "Maîtrisez l'Excellence Panafricaine"}
                        {landingPageSettings?.heroSubtitle && (
                            <>
                                <br />
                                <span className="text-brand-primary">{landingPageSettings.heroSubtitle}</span>
                            </>
                        )}
                    </h1>
                    <p className="text-base md:text-lg text-slate-500 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                        Rejoignez la plateforme leader pour vous former aux métiers d'avenir. Apprenez avec les meilleurs experts et propulsez votre carrière dès aujourd'hui.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                        {user ? (
                            <Link href={`/${locale}${dashboardUrl}`} className="w-full sm:w-auto px-10 py-5 bg-brand-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 active:scale-95">
                                <PlayCircle className="w-5 h-5" />
                                Reprendre ma formation
                            </Link>
                        ) : (
                            <>
                                {(landingPageSettings?.showHeroCta ?? true) && (
                                    <Link href={`/${locale}/login?tab=register`} className="w-full sm:w-auto px-10 py-5 bg-brand-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95">
                                        {landingPageSettings?.heroCtaText || "Commencer à apprendre"}
                                        <ChevronsRight className="w-5 h-5" />
                                    </Link>
                                )}
                            </>
                        )}
                        <Link href={`/${locale}/investir`} className="w-full sm:w-auto px-10 py-5 bg-white text-amber-600 border-2 border-amber-100 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-amber-50 transition flex items-center justify-center gap-2 active:scale-95">
                            <BadgeEuro className="w-5 h-5" />
                            Devenir Propriétaire
                        </Link>
                    </div>
                </div>

                <div className="relative animate-float block px-4 md:px-0 mt-8 lg:mt-0">
                    <div className="absolute -inset-4 bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 rounded-[3rem] blur-3xl opacity-30"></div>
                    <div className="relative aspect-video rounded-[2.5rem] shadow-2xl border-4 border-white overflow-hidden bg-slate-100">
                        <Image 
                            src={landingPageSettings?.heroImageUrl || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop"} 
                            alt="Étudiants Ndara Afrique" 
                            fill 
                            className="object-cover"
                            priority
                            sizes="(max-width: 768px) 100vw, 50vw"
                        />
                    </div>
                    
                    <div className="absolute -bottom-4 -left-4 md:-bottom-6 md:-left-6 bg-white p-4 md:p-5 rounded-3xl shadow-2xl border border-slate-50 flex items-center gap-4">
                        <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600 shrink-0">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">Réussite</p>
                            <p className="text-brand-dark font-black mt-1 text-sm">+24% de revenus</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- STATS SECTION --- */}
      <section className="py-12 md:py-20 bg-brand-dark text-white border-y border-white/5 relative bg-grainy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <Stats />
        </div>
      </section>

      {/* --- RECOMMANDATIONS PERSONNALISÉES (CONNECTÉ UNIQUEMENT) --- */}
      {user && (
          <section className="py-12 bg-white border-b border-slate-100 px-4 md:px-6">
              <div className="max-w-7xl mx-auto">
                  <RecommendedCourses />
              </div>
          </section>
      )}

      {/* --- BOURSE DU SAVOIR --- */}
      <section id="bourse" className="py-20 md:py-32 bg-brand-dark relative overflow-hidden px-4 md:px-12 border-y border-white/5 bg-grainy">
        <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-brand-primary text-[10px] font-black uppercase tracking-[0.2em] mx-auto lg:mx-0">
                        <BadgeEuro className="w-4 h-4" />
                        La Bourse du Savoir
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white leading-tight uppercase tracking-tighter">
                        Plus qu'une formation, <br/>
                        <span className="text-brand-primary">un actif financier.</span>
                    </h2>
                    <p className="text-slate-400 text-base md:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
                        Ndara Afrique permet aux investisseurs d'acquérir les droits de revente des meilleures formations. Encaissez des revenus passifs sur chaque vente et revendez vos licences selon l'évolution du marché.
                    </p>
                    <Button asChild size="lg" className="w-full sm:w-auto h-16 px-12 rounded-2xl bg-brand-primary hover:bg-emerald-600 text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-brand-primary/20 active:scale-95 transition-all">
                        <Link href={`/${locale}/investir`}>
                            Explorer les opportunités
                            <ChevronsRight className="ml-2 w-5 h-5" />
                        </Link>
                    </Button>
                </div>
                <div className="relative hidden lg:block">
                    <div className="relative aspect-[4/5] rounded-[4rem] overflow-hidden border border-white/10 shadow-2xl">
                        <Image 
                            src="https://images.unsplash.com/photo-1553729459-efe14ef6055d?q=80&w=1200&auto=format&fit=crop" 
                            alt="Investissement Ndara" 
                            fill 
                            className="object-cover grayscale hover:grayscale-0 transition-all duration-1000" 
                            sizes="40vw"
                        />
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- CATALOGUE --- */}
      <section id="formations" className="py-20 md:py-32 bg-white relative px-4 md:px-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center lg:items-end mb-16 gap-6 text-center md:text-left">
                <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-black text-brand-dark uppercase tracking-tighter">Formations <span className="text-brand-primary">Ndara</span></h2>
                    <p className="text-slate-500 font-medium">Les compétences du futur, sélectionnées par des experts.</p>
                </div>
                <Button variant="ghost" asChild className="text-brand-primary font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-50 h-12 px-8 rounded-xl">
                    <Link href={`/${locale}/search`}>
                        Tout le catalogue
                        <ChevronsRight className="w-4 h-4 ml-2" />
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                {loading ? (
                    [...Array(3)].map((_, i) => <div key={i} className="h-96 w-full bg-slate-100 animate-pulse rounded-[2.5rem]"></div>)
                ) : displayCourses.length > 0 ? (
                    displayCourses.map(course => (
                        <div key={course.id} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <CourseCard 
                                course={course} 
                                instructor={instructorsMap.get(course.instructorId) || null} 
                                variant="grid" 
                            />
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-24 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 opacity-60">
                        <TrendingUp className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                        <h4 className="text-lg font-black text-slate-400 uppercase tracking-tight">Contenus d'élite en préparation</h4>
                    </div>
                )}
            </div>
        </div>
      </section>

      <TestimonialsSection />
      
      <Footer />
    </div>
  );
}
