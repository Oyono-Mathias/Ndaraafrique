'use client';

/**
 * @fileOverview Landing Page Ndara Afrique - Version Intelligente & Adaptative.
 * ✅ VISION CEO : Intégration de la dimension "Bourse du Savoir" (Investissement).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, getFirestore, where, orderBy, getDocs, doc } from 'firebase/firestore';
import Link from 'next/link';
import type { Course, NdaraUser, Settings } from '@/lib/types';
import Image from 'next/image';
import { ChevronsRight, Menu, X, Laptop, Award, TrendingUp, Bot, CheckCircle2, PlayCircle, Sparkles, BadgeEuro, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/cards/CourseCard';
import { useRole } from '@/context/RoleContext';
import { useLocale } from 'next-intl';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Footer } from '@/components/layout/footer';
import { Stats } from '@/components/landing/Stats';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { RecommendedCourses } from '@/components/dashboards/RecommendedCourses';
import { useDoc } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Navbar = () => {
    const { user, currentUser, role } = useRole();
    const locale = useLocale();
    
    const dashboardUrl = useMemo(() => {
        if (role === 'admin') return '/admin';
        if (role === 'instructor') return '/instructor/dashboard';
        return '/student/dashboard';
    }, [role]);

    return (
        <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 h-20 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex justify-between items-center">
                <Link href={`/${locale}`} className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-lg flex items-center justify-center text-white font-bold shadow-lg">N</div>
                    <span className="text-xl font-bold text-brand-dark tracking-tight">Ndara <span className="text-brand-primary">Afrique</span></span>
                </Link>
                
                <div className="hidden md:flex space-x-8 items-center">
                    <a href="#formations" className="text-slate-600 hover:text-brand-primary font-medium transition uppercase tracking-widest text-[10px]">Formations</a>
                    <a href="#bourse" className="text-slate-600 hover:text-brand-primary font-medium transition uppercase tracking-widest text-[10px]">Marché de Droits</a>
                    <Link href={`/${locale}/abonnements`} className="text-slate-600 hover:text-brand-primary font-medium transition uppercase tracking-widest text-[10px]">Tarifs</Link>
                </div>

                <div className="hidden md:flex items-center space-x-4">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <Link href={`/${locale}${dashboardUrl}`} className="text-brand-dark font-black uppercase text-[10px] tracking-widest hover:text-brand-primary transition bg-slate-100 px-4 py-2 rounded-full flex items-center gap-2">
                                <LayoutDashboardIcon className="w-3 h-3" />
                                Mon Espace
                            </Link>
                            <Avatar className="h-10 w-10 border-2 border-brand-primary/20">
                                <AvatarImage src={currentUser?.profilePictureURL} />
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

                <div className="md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-600">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="bg-white border-l border-slate-200 p-0 w-[280px] z-[10005]">
                            <div className="p-6 flex flex-col gap-6 h-full">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center text-white font-bold">N</div>
                                        <span className="text-xl font-bold text-brand-dark">Ndara</span>
                                    </div>
                                    <SheetClose asChild>
                                        <Button variant="ghost" size="icon"><X className="h-5 w-5" /></Button>
                                    </SheetClose>
                                </div>
                                <div className="flex flex-col gap-4 mt-8">
                                    <SheetClose asChild><a href="#formations" className="text-lg font-bold text-slate-600">Formations</a></SheetClose>
                                    <SheetClose asChild><a href="#bourse" className="text-lg font-bold text-slate-600">Investir</a></SheetClose>
                                    <SheetClose asChild><Link href={`/${locale}/abonnements`} className="text-lg font-bold text-slate-600">Tarifs</Link></SheetClose>
                                    <hr className="border-slate-100 my-2" />
                                    {user ? (
                                        <SheetClose asChild><Link href={`/${locale}${dashboardUrl}`} className="text-lg font-bold text-brand-primary">Tableau de bord</Link></SheetClose>
                                    ) : (
                                        <>
                                            <SheetClose asChild><Link href={`/${locale}/login`} className="text-lg font-bold text-slate-600">Connexion</Link></SheetClose>
                                            <SheetClose asChild><Link href={`/${locale}/login?tab=register`} className="text-lg font-bold text-brand-primary">S'inscrire</Link></SheetClose>
                                        </>
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

function LayoutDashboardIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

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
    <div className="bg-slate-50 text-slate-800 antialiased overflow-x-hidden selection:bg-brand-primary/30 font-sans">
      <Navbar />
      
      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden px-6">
        <div className="absolute inset-0 z-0">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50 to-transparent opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-gradient-to-t from-emerald-50 to-transparent opacity-50"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="text-center lg:text-left animate-fade-in-up">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-brand-secondary text-sm font-semibold mb-6">
                        <span className="w-2 h-2 rounded-full bg-brand-primary mr-2 animate-pulse"></span>
                        {user ? `Content de vous revoir, ${currentUser?.fullName?.split(' ')[0]} !` : "Nouvelle session disponible"}
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-brand-dark leading-tight mb-6 uppercase tracking-tight">
                        {landingPageSettings?.heroTitle || "Maîtrisez l'Excellence Panafricaine"}
                        {landingPageSettings?.heroSubtitle && (
                            <>
                                <br />
                                <span className="gradient-text">{landingPageSettings.heroSubtitle}</span>
                            </>
                        )}
                    </h1>
                    <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                        Ndara Afrique est la plateforme leader pour se former aux métiers d'avenir. Apprenez avec les meilleurs experts du continent et propulsez votre carrière.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                        {user ? (
                            <Link href={`/${locale}${dashboardUrl}`} className="px-10 py-4 bg-brand-primary text-white rounded-full font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 active:scale-95">
                                <PlayCircle className="w-5 h-5" />
                                Reprendre ma formation
                            </Link>
                        ) : (
                            <>
                                {(landingPageSettings?.showHeroCta ?? true) && (
                                    <Link href={`/${locale}/login?tab=register`} className="px-10 py-4 bg-brand-primary text-white rounded-full font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95">
                                        {landingPageSettings?.heroCtaText || "Commencer à apprendre"}
                                        <ChevronsRight className="w-5 h-5" />
                                    </Link>
                                )}
                            </>
                        )}
                        {(landingPageSettings?.showHeroExplore ?? true) && (
                            <Link href={`/${locale}/search`} className="px-10 py-4 bg-white text-brand-dark border border-slate-200 rounded-full font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition flex items-center justify-center active:scale-95">
                                Explorer le catalogue
                            </Link>
                        )}
                    </div>
                    
                    <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                            Certificats Inclus
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                            Accès Permanent
                        </div>
                    </div>
                </div>

                <div className="relative animate-float block">
                    <div className="absolute -inset-4 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-2xl blur-3xl opacity-10"></div>
                    <div className="relative aspect-video rounded-3xl shadow-2xl border border-white/50 overflow-hidden transform hover:scale-[1.01] transition duration-500 bg-slate-200">
                        <Image 
                            src={landingPageSettings?.heroImageUrl || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop"} 
                            alt="Étudiants Ndara Afrique" 
                            fill 
                            className="object-cover"
                            priority
                        />
                    </div>
                    
                    <div className="absolute -bottom-6 -left-6 bg-white p-5 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4 animate-bounce" style={{ animationDuration: '4s' }}>
                        <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none">Succès</p>
                            <p className="text-brand-dark font-bold mt-1">+24% de revenus</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- RECOMMANDATIONS PERSONNALISÉES (CONNECTÉ UNIQUEMENT) --- */}
      {user && (
          <section className="py-12 bg-white border-y border-slate-100 px-6">
              <div className="max-w-7xl mx-auto">
                  <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-brand-primary/10 rounded-lg">
                          <Sparkles className="w-5 h-5 text-brand-primary" />
                      </div>
                      <h2 className="text-xl font-black text-brand-dark uppercase tracking-tight">Spécialement pour vous, {currentUser?.fullName?.split(' ')[0]}</h2>
                  </div>
                  <RecommendedCourses />
              </div>
          </section>
      )}

      {/* --- STATS SECTION --- */}
      <section className="py-16 bg-brand-dark text-white border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
            <Stats />
        </div>
      </section>

      {/* --- MARCHÉ DE DROITS (BOURSE DU SAVOIR) --- */}
      <section id="bourse" className="py-24 bg-brand-dark relative overflow-hidden px-6 md:px-12 border-y border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary rounded-full blur-[120px] opacity-10 -translate-y-1/2 translate-x-1/2"></div>
        <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-brand-primary text-xs font-black uppercase tracking-[0.2em]">
                        <BadgeEuro className="w-4 h-4" />
                        Bourse du Savoir
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white leading-tight uppercase tracking-tight">
                        Plus qu'une formation, <br/>
                        <span className="text-brand-primary">un actif rentable.</span>
                    </h2>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        Ndara Afrique révolutionne l'EdTech en permettant aux investisseurs d'acquérir les droits de revente des meilleures formations. Encaissez des revenus passifs sur chaque vente et revendez vos licences au prix fort.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-6">
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                            <Landmark className="w-8 h-8 text-brand-primary" />
                            <h4 className="font-bold text-white uppercase text-sm">Propriété Réelle</h4>
                            <p className="text-slate-500 text-xs">Devenez l'exploitant exclusif d'un cours et touchez vos commissions à vie.</p>
                        </div>
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                            <TrendingUp className="w-8 h-8 text-blue-400" />
                            <h4 className="font-bold text-white uppercase text-sm">Marché Libre</h4>
                            <p className="text-slate-500 text-xs">Revendez vos droits de licence à d'autres partenaires dès que leur valeur augmente.</p>
                        </div>
                    </div>
                    <Button asChild size="lg" className="h-16 px-10 rounded-2xl bg-brand-primary hover:bg-emerald-600 text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-brand-primary/20">
                        <Link href={`/${locale}/investir`}>
                            Découvrir le programme Investisseur
                            <ChevronsRight className="ml-2 w-5 h-5" />
                        </Link>
                    </Button>
                </div>
                <div className="relative">
                    <div className="relative aspect-[4/5] rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                        <Image 
                            src="https://images.unsplash.com/photo-1553729459-efe14ef6055d?q=80&w=1200&auto=format&fit=crop" 
                            alt="Investissement Ndara" 
                            fill 
                            className="object-cover grayscale hover:grayscale-0 transition-all duration-700" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent"></div>
                        <div className="absolute bottom-10 left-10 right-10 p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
                            <p className="text-white font-bold italic text-lg leading-relaxed">
                                "Nous transformons le savoir africain en une classe d'actifs numériques accessible à tous."
                            </p>
                            <p className="mt-4 text-brand-primary font-black uppercase text-[10px] tracking-widest">— Mathias Oyono, CEO</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- MÉTHODOLOGIE --- */}
      <section id="methodologie" className="py-24 bg-white relative px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                <h2 className="text-brand-primary font-black tracking-[0.3em] uppercase text-[10px]">Notre Mission</h2>
                <h3 className="text-3xl md:text-4xl font-black text-brand-dark uppercase tracking-tight">{landingPageSettings?.howItWorksTitle || "Apprenez avec Efficacité"}</h3>
                <p className="text-slate-600 font-medium leading-relaxed">{landingPageSettings?.howItWorksSubtitle || "Une approche pédagogique unique qui combine théorie rigoureuse et pratique intensive."}</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 hover:shadow-lg hover:shadow-brand-primary/10 transition duration-300 group glass-card">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-brand-secondary mb-8 group-hover:scale-110 transition shadow-lg">
                        <Laptop className="w-7 h-7" />
                    </div>
                    <h4 className="text-xl font-black text-brand-dark mb-4 uppercase tracking-tight">Savoir Pratique</h4>
                    <p className="text-slate-600 text-sm leading-relaxed font-medium">Nos cours sont conçus par des experts terrain pour vous apporter des compétences immédiatement applicables.</p>
                </div>

                <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 hover:shadow-lg hover:shadow-brand-primary/10 transition duration-300 group glass-card">
                    <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-brand-primary mb-8 group-hover:scale-110 transition shadow-lg">
                        <Award className="w-7 h-7" />
                    </div>
                    <h4 className="text-xl font-black text-brand-dark mb-4 uppercase tracking-tight">Diplômes Reconnus</h4>
                    <p className="text-slate-600 text-sm leading-relaxed font-medium">Obtenez un certificat Ndara Afrique officiel à la fin de chaque parcours pour valoriser votre profil.</p>
                </div>

                <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 hover:shadow-lg hover:shadow-brand-primary/10 transition duration-300 group glass-card">
                    <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-8 group-hover:scale-110 transition shadow-lg">
                        <Bot className="w-7 h-7" />
                    </div>
                    <h4 className="text-xl font-black text-brand-dark mb-4 uppercase tracking-tight">Mentorat Interactif</h4>
                    <p className="text-slate-600 text-sm leading-relaxed font-medium">Accédez à une communauté d'apprenants et posez vos questions à notre IA Mathias 24h/24.</p>
                </div>
            </div>
        </div>
      </section>

      {/* --- TÉMOIGNAGES --- */}
      <section className="bg-slate-50 border-t border-slate-200 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
            <TestimonialsSection />
        </div>
      </section>

      {/* --- CATALOGUE --- */}
      <section id="formations" className="py-24 bg-white relative overflow-hidden px-6 md:px-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-black text-brand-dark uppercase tracking-tight">Formations <span className="text-brand-primary">Phare</span></h2>
                    <p className="text-slate-600 font-medium">Le savoir à l'état pur, accessible maintenant.</p>
                </div>
                <Link href={`/${locale}/search`} className="flex items-center text-brand-primary font-black uppercase text-[10px] tracking-[0.2em] hover:text-blue-500 transition-colors">
                    Tout le catalogue
                    <ChevronsRight className="w-4 h-4 ml-2" />
                </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                {loading ? (
                    [...Array(3)].map((_, i) => <div key={i} className="h-80 w-full bg-slate-200 animate-pulse rounded-[2.5rem]"></div>)
                ) : displayCourses.length > 0 ? (
                    displayCourses.map(course => (
                        <CourseCard 
                            key={course.id} 
                            course={course} 
                            instructor={instructorsMap.get(course.instructorId) || null} 
                            variant="grid" 
                        />
                    ))
                ) : (
                    <div className="col-span-full text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 shadow-sm opacity-60">
                        <TrendingUp className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                        <h4 className="text-lg font-bold text-slate-400 uppercase tracking-tight">Nos contenus d'élite arrivent bientôt</h4>
                        <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto font-medium">Nous finalisons la production de nos prochaines formations avec les meilleurs experts. Revenez très vite !</p>
                    </div>
                )}
            </div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="py-32 relative overflow-hidden bg-brand-dark px-6">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-primary rounded-full blur-[120px] opacity-20"></div>
        
        <div className="max-w-4xl mx-auto relative z-10 text-center space-y-10">
            <h2 className="text-3xl md:text-6xl font-black text-white uppercase tracking-tight leading-tight">{user ? "Prêt à continuer l'aventure ?" : (landingPageSettings?.finalCtaTitle || "Prêt à devenir un expert ?")}</h2>
            <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                {user ? "Votre progression est sauvegardée. Vos certificats vous attendent." : (landingPageSettings?.finalCtaSubtitle || "Rejoignez des milliers d'apprenants qui transforment leur passion en métier. Votre première leçon est à portée de clic.")}
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-6">
                {user ? (
                    <Link href={`/${locale}${dashboardUrl}`} className="px-12 py-5 bg-brand-primary text-white rounded-full font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition shadow-2xl shadow-emerald-500/40 active:scale-95 text-center">
                        Accéder à mon tableau de bord
                    </Link>
                ) : (
                    <>
                        {(landingPageSettings?.showFinalCta ?? true) && (
                            <Link href={`/${locale}/login?tab=register`} className="px-12 py-5 bg-brand-primary text-white rounded-full font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition shadow-2xl shadow-emerald-500/40 active:scale-95 text-center">
                                {landingPageSettings?.finalCtaButtonText || "Créer mon profil gratuit"}
                            </Link>
                        )}
                    </>
                )}
                {(landingPageSettings?.showFinalContact ?? true) && (
                    <Link href={`/${locale}/student/support`} className="px-12 py-5 bg-transparent border border-slate-700 text-white rounded-full font-black uppercase text-xs tracking-widest hover:bg-white/5 transition active:scale-95 text-center">
                        Contacter un conseiller
                    </Link>
                )}
            </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
