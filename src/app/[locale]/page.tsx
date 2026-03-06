
'use client';

/**
 * @fileOverview Landing Page Ndara Afrique - Design Fintech Premium & Dynamique.
 * ✅ RÉALIGNÉ : Focus 100% sur la FORMATION EN LIGNE (E-learning).
 * ✅ TEMPS RÉEL : Connecté à Firestore pour les cours et les stats.
 * ✅ CONNECTIVITÉ : 10 boutons/liens opérationnels.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, getFirestore, where, orderBy, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import type { Course, NdaraUser } from '@/lib/types';
import Image from 'next/image';
import { ChevronsRight, BookOpen, CheckCircle2, Users, Menu, X, GraduationCap, Laptop, Award, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/cards/CourseCard';
import { useRole } from '@/context/RoleContext';
import { useLocale } from 'next-intl';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Footer } from '@/components/layout/footer';
import { Stats } from '@/components/landing/Stats';

const Navbar = () => {
    const { user, role } = useRole();
    const locale = useLocale();
    const dashboardUrl = role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';

    return (
        <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 transition-all duration-300 h-16 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex justify-between items-center">
                <Link href={`/${locale}`} className="flex items-center gap-2 group">
                    <div className="relative w-8 h-8 overflow-hidden flex items-center justify-center">
                        <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-cover" priority />
                    </div>
                    <span className="text-lg font-bold text-brand-dark tracking-tight">Ndara <span className="text-brand-primary">Afrique</span></span>
                </Link>
                
                <div className="hidden md:flex space-x-8 items-center">
                    <a href="#formations" className="text-sm font-semibold text-slate-600 hover:text-brand-primary transition">Formations</a>
                    <a href="#methodologie" className="text-sm font-semibold text-slate-600 hover:text-brand-primary transition">Notre Méthode</a>
                    <Link href={`/${locale}/abonnements`} className="text-sm font-semibold text-slate-600 hover:text-brand-primary transition">Tarifs</Link>
                </div>

                <div className="hidden md:flex items-center space-x-4">
                    {user ? (
                        <Link href={`/${locale}${dashboardUrl}`} className="text-brand-dark font-black uppercase text-[10px] tracking-widest hover:text-brand-primary transition">
                            Mon Espace
                        </Link>
                    ) : (
                        <>
                            <Link href={`/${locale}/login`} className="text-sm font-bold text-brand-dark hover:text-brand-primary transition">
                                Connexion
                            </Link>
                            <Link href={`/${locale}/login?tab=register`} className="bg-brand-dark text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-lg shadow-brand-dark/20 active:scale-95">
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
                        <SheetContent side="right" className="bg-white border-l border-slate-200 p-0 w-[280px]">
                            <div className="p-6 flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Image src="/logo.png" alt="Logo" width={32} height={32} className="rounded-lg" />
                                        <span className="text-xl font-bold text-brand-dark">Ndara</span>
                                    </div>
                                    <SheetClose asChild>
                                        <Button variant="ghost" size="icon"><X className="h-5 w-5" /></Button>
                                    </SheetClose>
                                </div>
                                <nav className="flex flex-col gap-4">
                                    <SheetClose asChild><a href="#formations" className="text-lg font-bold text-slate-600">Formations</a></SheetClose>
                                    <SheetClose asChild><a href="#methodologie" className="text-lg font-bold text-slate-600">Notre Méthode</a></SheetClose>
                                    <SheetClose asChild><Link href={`/${locale}/abonnements`} className="text-lg font-bold text-slate-600">Tarifs</Link></SheetClose>
                                    <hr className="border-slate-100" />
                                    {user ? (
                                        <SheetClose asChild><Link href={`/${locale}${dashboardUrl}`} className="text-lg font-bold text-brand-primary">Tableau de bord</Link></SheetClose>
                                    ) : (
                                        <>
                                            <SheetClose asChild><Link href={`/${locale}/login`} className="text-lg font-bold text-slate-600">Connexion</Link></SheetClose>
                                            <SheetClose asChild><Link href={`/${locale}/login?tab=register`} className="text-lg font-bold text-brand-primary">S'inscrire</Link></SheetClose>
                                        </>
                                    )}
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
  const db = getFirestore();
  const locale = useLocale();
  const { user, role } = useRole();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());

  const dashboardUrl = role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';

  useEffect(() => {
    const q = query(collection(db, "courses"), where("status", "==", "Published"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(coursesData);
      
      if (coursesData.length > 0) {
        const instructorIds = [...new Set(coursesData.map(c => c.instructorId).filter(Boolean))];
        const usersRef = collection(db, 'users');
        const newMap = new Map();
        
        for (let i = 0; i < instructorIds.length; i += 30) {
            const chunk = instructorIds.slice(i, i + 30);
            if (chunk.length === 0) continue;
            const qInst = query(usersRef, where('uid', 'in', chunk));
            const snap = await getDocs(qInst);
            snap.forEach(d => newMap.set(d.id, d.data()));
        }
        setInstructorsMap(newMap);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db]);

  const displayCourses = useMemo(() => {
    if (courses.length > 0) return courses.slice(0, 3);
    return [
        { 
            id: 'demo-1', 
            title: 'Maîtriser le Développement Web', 
            category: 'Tech', 
            price: 45000, 
            imageUrl: 'https://images.unsplash.com/photo-1608742213509-815b97c30b36?w=800&q=80',
            description: 'Apprenez à coder des applications modernes avec React et Node.js.',
            instructorId: 'demo'
        },
        { 
            id: 'demo-2', 
            title: 'Entrepreneuriat et Innovation', 
            category: 'Business', 
            price: 65000, 
            imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80',
            description: "Créez et gérez votre entreprise avec les outils du 21ème siècle.",
            instructorId: 'demo'
        },
        { 
            id: 'demo-3', 
            title: 'Design UI/UX Professionnel', 
            category: 'Design', 
            price: 35000, 
            imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
            description: 'Concevez des interfaces centrées sur l’utilisateur pour le web et mobile.',
            instructorId: 'demo'
        }
    ] as any[];
  }, [courses]);

  return (
    <div className="bg-slate-50 text-slate-800 antialiased overflow-x-hidden">
      <Navbar />
      
      {/* --- HERO SECTION --- */}
      <section className="relative pt-24 pb-16 lg:pt-40 lg:pb-32 overflow-hidden px-6">
        <div className="absolute inset-0 z-0">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50 to-transparent opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-gradient-to-t from-emerald-50 to-transparent opacity-50"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="text-center lg:text-left animate-fade-in-up">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-brand-secondary text-[10px] font-black uppercase tracking-widest mb-6">
                        <span className="w-2 h-2 rounded-full bg-brand-primary mr-2 animate-pulse"></span>
                        Formations certifiantes
                    </div>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-brand-dark leading-tight mb-6 tracking-tight uppercase">
                        Maîtrisez les <br />
                        <span className="gradient-text">Compétences de Demain</span>
                    </h1>
                    <p className="text-base md:text-lg text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                        Ndara Afrique est la plateforme leader pour se former aux métiers d'avenir. Apprenez avec les meilleurs experts du continent et propulsez votre carrière.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                        <Link href={user ? `/${locale}${dashboardUrl}` : `/${locale}/login?tab=register`} className="px-10 py-4 bg-brand-primary text-white rounded-full font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95">
                            Commencer à apprendre
                            <ChevronsRight className="w-5 h-5" />
                        </Link>
                        <Link href={`/${locale}/search`} className="px-10 py-4 bg-white text-brand-dark border border-slate-200 rounded-full font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition flex items-center justify-center active:scale-95">
                            Explorer les cours
                        </Link>
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

                <div className="relative animate-float hidden lg:block">
                    <div className="absolute -inset-4 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-2xl blur-3xl opacity-10"></div>
                    <div className="relative aspect-video rounded-3xl shadow-2xl border border-white/50 overflow-hidden transform hover:scale-[1.01] transition duration-500 bg-slate-200">
                        <Image 
                            src="https://ndara-assets.b-cdn.net/assets/students-collaboration.jpg" 
                            alt="Étudiants Ndara Afrique" 
                            fill 
                            className="object-cover"
                            priority
                        />
                    </div>
                    
                    <div className="absolute -bottom-6 -left-6 bg-white p-5 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-4 animate-bounce" style={{ animationDuration: '4s' }}>
                        <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Réussite</p>
                            <p className="text-brand-dark font-bold">15k+ Diplômés</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- STATS SECTION --- */}
      <section className="py-16 bg-brand-dark text-white border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
            <Stats />
        </div>
      </section>

      {/* --- METHODOLOGIE (GLASS CARDS) --- */}
      <section id="methodologie" className="py-24 bg-white relative px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                <h2 className="text-brand-primary font-black tracking-[0.3em] uppercase text-[10px]">Notre Mission</h2>
                <h3 className="text-3xl md:text-4xl font-black text-brand-dark uppercase tracking-tight">Apprenez avec <span className="text-brand-primary">Efficacité</span></h3>
                <p className="text-slate-600 font-medium leading-relaxed">Une infrastructure technologique au service de votre montée en compétences.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                <div className="p-8 rounded-[2rem] glass-card hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 group border-border/50">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-brand-secondary mb-8 group-hover:scale-110 transition shadow-lg shadow-blue-500/10">
                        <Laptop className="w-7 h-7" />
                    </div>
                    <h4 className="text-lg font-black text-brand-dark mb-4 uppercase tracking-tight">Savoir Pratique</h4>
                    <p className="text-slate-600 text-sm leading-relaxed font-medium">Nos cours sont conçus par des experts terrain pour vous apporter des compétences immédiatement applicables.</p>
                </div>

                <div className="p-8 rounded-[2rem] glass-card hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 group border-border/50">
                    <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-brand-primary mb-8 group-hover:scale-110 transition shadow-lg shadow-emerald-500/10">
                        <Award className="w-7 h-7" />
                    </div>
                    <h4 className="text-lg font-black text-brand-dark mb-4 uppercase tracking-tight">Diplômes Reconnus</h4>
                    <p className="text-slate-600 text-sm leading-relaxed font-medium">Obtenez un certificat Ndara Afrique officiel à la fin de chaque parcours pour valoriser votre profil.</p>
                </div>

                <div className="p-8 rounded-[2rem] glass-card hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 group border-border/50">
                    <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-8 group-hover:scale-110 transition shadow-lg shadow-purple-500/10">
                        <Users className="w-7 h-7" />
                    </div>
                    <h4 className="text-lg font-black text-brand-dark mb-4 uppercase tracking-tight">Mentorat Interactif</h4>
                    <p className="text-slate-600 text-sm leading-relaxed font-medium">Accédez à une communauté d'apprenants et posez vos questions à notre IA Mathias 24h/24.</p>
                </div>
            </div>
        </div>
      </section>

      {/* --- FORMATIONS POPULAIRES (DYNAMIC) --- */}
      <section id="formations" className="py-24 bg-slate-50 relative overflow-hidden px-6 md:px-12">
        <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-black text-brand-dark uppercase tracking-tight">Formations <span className="text-brand-primary">Phare</span></h2>
                    <p className="text-slate-600 font-medium">Lancez votre transformation dès aujourd'hui.</p>
                </div>
                <Link href={`/${locale}/search`} className="flex items-center text-brand-primary font-black uppercase text-[10px] tracking-[0.2em] hover:text-blue-500 transition-colors">
                    Tout le catalogue
                    <ChevronsRight className="w-4 h-4 ml-2" />
                </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                {loading ? (
                    [...Array(3)].map((_, i) => <div key={i} className="h-80 w-full bg-slate-200 animate-pulse rounded-[2.5rem]"></div>)
                ) : (
                    displayCourses.map(course => (
                        <CourseCard 
                            key={course.id} 
                            course={course} 
                            instructor={instructorsMap.get(course.instructorId) || null} 
                            variant="grid" 
                        />
                    ))
                )}
            </div>
        </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="py-32 relative overflow-hidden bg-brand-dark px-6">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-primary rounded-full blur-[120px] opacity-20"></div>
        
        <div className="max-w-4xl mx-auto relative z-10 text-center space-y-10">
            <h2 className="text-3xl md:text-6xl font-black text-white uppercase tracking-tight leading-tight">
                Prêt à devenir <br /><span className="text-brand-primary">un expert ?</span>
            </h2>
            <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                Rejoignez des milliers d'apprenants qui transforment leur passion en métier. Votre première leçon est à portée de clic.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-6">
                <Link href={`/${locale}/login?tab=register`} className="px-12 py-5 bg-brand-primary text-white rounded-full font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition shadow-2xl shadow-emerald-500/40 active:scale-95 text-center">
                    Créer mon profil gratuit
                </Link>
                <Link href={`/${locale}/student/support`} className="px-12 py-5 bg-transparent border border-slate-700 text-white rounded-full font-black uppercase text-xs tracking-widest hover:bg-white/5 transition active:scale-95 text-center">
                    Contacter un conseiller
                </Link>
            </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
