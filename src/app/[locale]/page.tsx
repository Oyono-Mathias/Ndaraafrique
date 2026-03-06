
'use client';

/**
 * @fileOverview Landing Page Ndara Afrique - Design Fintech Premium.
 * Implémentation du design exact fourni par le CEO.
 * ✅ HERO : Gradient text et animation fade-in-up.
 * ✅ GLASS-CARDS : Méthodologie avec backdrop-blur.
 * ✅ STATS : Section d'autorité sur fond sombre.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, getFirestore, where, orderBy, getDocs, doc } from 'firebase/firestore';
import Link from 'next/link';
import type { Course, NdaraUser, Settings } from '@/lib/types';
import Image from 'next/image';
import { Sparkles, ChevronsRight, BookCopy, Wallet, Award, CheckCircle2, Bot, Users, TrendingUp, Search, Menu, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CourseCard } from '@/components/cards/CourseCard';
import { DynamicCarousel } from '@/components/ui/DynamicCarousel';
import { useRole } from '@/context/RoleContext';
import { useDoc } from '@/firebase';
import { logTrackingEvent } from '@/actions/trackingActions';
import { useLocale } from 'next-intl';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Footer } from '@/components/layout/footer';

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const { user, role } = useRole();
    const locale = useLocale();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const dashboardUrl = role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';

    return (
        <nav className={cn(
            "fixed w-full z-50 transition-all duration-300 h-20 flex items-center",
            scrolled ? "bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-md" : "bg-white/80 backdrop-blur-md border-b border-slate-200"
        )}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex justify-between items-center">
                <Link href={`/${locale}`} className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">N</div>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">Ndara <span className="text-emerald-500">Afrique</span></span>
                </Link>
                
                <div className="hidden md:flex space-x-8 items-center">
                    <a href="#formations" className="text-slate-600 hover:text-emerald-500 font-medium transition">Formations</a>
                    <a href="#methodologie" className="text-slate-600 hover:text-emerald-500 font-medium transition">Méthodologie</a>
                    <Link href="/abonnements" className="text-slate-600 hover:text-emerald-500 font-medium transition">Tarifs</Link>
                </div>

                <div className="hidden md:flex items-center space-x-4">
                    <Link href={user ? `/${locale}${dashboardUrl}` : `/${locale}/login`} className="text-slate-900 font-medium hover:text-emerald-500 transition">
                        {user ? "Dashboard" : "Connexion"}
                    </Link>
                    {!user && (
                        <Link href={`/${locale}/login?tab=register`} className="bg-slate-950 text-white px-6 py-2.5 rounded-full font-medium hover:bg-slate-800 transition shadow-lg shadow-slate-950/20 active:scale-95">
                            S'inscrire
                        </Link>
                    )}
                </div>

                <div className="md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-600">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="bg-white border-l border-slate-200 p-0 w-[280px]">
                            <div className="p-6 flex flex-col gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold">N</div>
                                    <span className="text-xl font-bold text-slate-900">Ndara</span>
                                </div>
                                <nav className="flex flex-col gap-4">
                                    <SheetClose asChild><a href="#formations" className="text-lg font-bold text-slate-600 hover:text-emerald-500">Formations</a></SheetClose>
                                    <SheetClose asChild><a href="#methodologie" className="text-lg font-bold text-slate-600 hover:text-emerald-500">Méthodologie</a></SheetClose>
                                    <SheetClose asChild><Link href="/abonnements" className="text-lg font-bold text-slate-600 hover:text-emerald-500">Tarifs</Link></SheetClose>
                                    <hr className="border-slate-100" />
                                    <SheetClose asChild><Link href={user ? `/${locale}${dashboardUrl}` : `/${locale}/login`} className="text-lg font-bold text-emerald-500">
                                        {user ? "Mon Espace" : "Connexion"}
                                    </Link></SheetClose>
                                </nav>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </nav>
    );
};

export default function LandingPage() {
  const { user, role } = useRole();
  const db = getFirestore();
  const locale = useLocale();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());

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

  const popularCourses = useMemo(() => courses.slice(0, 3), [courses]);

  return (
    <div className="bg-slate-50 text-slate-800 antialiased overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar />
      
      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50 to-transparent opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-gradient-to-t from-emerald-50 to-transparent opacity-50"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="text-center lg:text-left animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-semibold mb-6">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                        Nouvelle session disponible
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-950 leading-tight mb-6 tracking-tight">
                        Investissez dans votre <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-blue-500">Avenir Financier</span>
                    </h1>
                    <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                        Ndara Afrique est la plateforme de référence pour maîtriser la finance, le trading et l'entrepreneuriat digital. Des experts locaux pour vous guider vers l'indépendance.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                        <Link href={user ? `/${locale}/student/dashboard` : `/${locale}/login?tab=register`} className="px-8 py-4 bg-emerald-500 text-white rounded-full font-bold text-lg hover:bg-emerald-600 transition shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95">
                            Commencer maintenant
                            <ChevronsRight className="w-5 h-5" />
                        </Link>
                        <Link href="/search" className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 transition flex items-center justify-center active:scale-95">
                            Voir le catalogue
                        </Link>
                    </div>
                    
                    <div className="mt-10 flex items-center justify-center lg:justify-start gap-6 text-slate-500 text-sm font-medium">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            Certifié Ndara
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            Accès à vie
                        </div>
                    </div>
                </div>

                <div className="relative hidden lg:block animate-in fade-in zoom-in duration-1000">
                    <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl blur-2xl opacity-20"></div>
                    <div className="relative aspect-video rounded-2xl shadow-2xl border border-white/50 overflow-hidden transform hover:scale-[1.01] transition duration-500">
                        <Image 
                            src="https://ndara-assets.b-cdn.net/assets/students-collaboration.jpg" 
                            alt="Étudiants Ndara Afrique" 
                            fill 
                            className="object-cover"
                            priority
                        />
                    </div>
                    
                    {/* Floating Badge */}
                    <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-slate-100 flex items-center gap-3 animate-bounce" style={{ animationDuration: '3s' }}>
                        <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-semibold uppercase">Succès</p>
                            <p className="text-slate-900 font-bold">+24% de revenus</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- STATS SECTION (BRAND DARK) --- */}
      <section className="py-12 bg-slate-950 text-white border-y border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div className="space-y-1">
                    <p className="text-3xl md:text-4xl font-black text-emerald-500">15k+</p>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Étudiants Actifs</p>
                </div>
                <div className="space-y-1">
                    <p className="text-3xl md:text-4xl font-black text-emerald-500">50+</p>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Formations Premium</p>
                </div>
                <div className="space-y-1">
                    <p className="text-3xl md:text-4xl font-black text-emerald-500">4.9/5</p>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Note Moyenne</p>
                </div>
                <div className="space-y-1">
                    <p className="text-3xl md:text-4xl font-black text-emerald-500">24/7</p>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Support Mentor</p>
                </div>
            </div>
        </div>
      </section>

      {/* --- FEATURES / METHODOLOGY (GLASS CARDS) --- */}
      <section id="methodologie" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                <h2 className="text-emerald-500 font-black tracking-[0.2em] uppercase text-xs">Pourquoi Ndara ?</h2>
                <h3 className="text-3xl md:text-4xl font-black text-slate-950 uppercase tracking-tight">Une approche pédagogique <span className="text-emerald-500">unique</span></h3>
                <p className="text-slate-600 font-medium">Nous combinons théorie financière rigoureuse et pratique intensive sur les marchés réels.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <div className="p-8 rounded-[2rem] bg-slate-50/50 backdrop-blur-md border border-slate-100 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 group">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition shadow-lg shadow-blue-500/10">
                        <BookCopy className="w-6 h-6" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-950 mb-3 uppercase tracking-tight">Apprentissage Adaptatif</h4>
                    <p className="text-slate-600 text-sm leading-relaxed">Notre IA Mathias analyse vos progrès et adapte le contenu pour combler vos lacunes en finance et trading.</p>
                </div>

                {/* Feature 2 */}
                <div className="p-8 rounded-[2rem] bg-slate-50/50 backdrop-blur-md border border-slate-100 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 group">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition shadow-lg shadow-emerald-500/10">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-950 mb-3 uppercase tracking-tight">Certification Reconnue</h4>
                    <p className="text-slate-600 text-sm leading-relaxed">Obtenez un certificat Ndara officiel à la fin de chaque parcours pour valoriser votre expertise.</p>
                </div>

                {/* Feature 3 */}
                <div className="p-8 rounded-[2rem] bg-slate-50/50 backdrop-blur-md border border-slate-100 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 group">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition shadow-lg shadow-purple-500/10">
                        <Users className="w-6 h-6" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-950 mb-3 uppercase tracking-tight">Communauté Elite</h4>
                    <p className="text-slate-600 text-sm leading-relaxed">Rejoignez un réseau fermé d'investisseurs et d'entrepreneurs à travers toute l'Afrique.</p>
                </div>
            </div>
        </div>
      </section>

      {/* --- POPULAR COURSES --- */}
      <section id="formations" className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-950 uppercase tracking-tight">Formations <span className="text-emerald-500">Populaires</span></h2>
                    <p className="text-slate-600 font-medium mt-2">Les cours les plus plébiscités par nos étudiants cette semaine.</p>
                </div>
                <Link href="/search" className="flex items-center text-emerald-500 font-black uppercase text-[10px] tracking-[0.2em] hover:text-blue-500 transition-colors">
                    Voir tout le catalogue
                    <ChevronsRight className="w-4 h-4 ml-2" />
                </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                    [...Array(3)].map((_, i) => <div key={i} className="h-80 w-full bg-slate-200 animate-pulse rounded-2xl"></div>)
                ) : popularCourses.length > 0 ? (
                    popularCourses.map(course => (
                        <CourseCard 
                            key={course.id} 
                            course={course} 
                            instructor={instructorsMap.get(course.instructorId) || null} 
                            variant="grid" 
                        />
                    ))
                ) : (
                    <p className="text-slate-400 col-span-full text-center py-12">Aucune formation disponible pour le moment.</p>
                )}
            </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-32 relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500 rounded-full blur-[120px] opacity-20"></div>
        
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-8">
            <h2 className="text-3xl md:text-6xl font-black text-white uppercase tracking-tight leading-none">
                Prêt à transformer <br /><span className="text-emerald-500">votre avenir ?</span>
            </h2>
            <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                Rejoignez plus de 15 000 étudiants qui ont déjà changé leur vie grâce à Ndara Afrique. Commencez votre premier cours aujourd'hui.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link href={`/${locale}/login?tab=register`} className="px-10 py-5 bg-emerald-500 text-white rounded-full font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition shadow-2xl shadow-emerald-500/40 active:scale-95">
                    Créer un compte gratuit
                </Link>
                <Link href="/support" className="px-10 py-5 bg-transparent border border-slate-700 text-white rounded-full font-black uppercase text-xs tracking-widest hover:bg-white/5 transition active:scale-95">
                    Contacter un conseiller
                </Link>
            </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
