
'use client';

/**
 * @fileOverview Landing Page Ndara Afrique - Standard Fintech Premium.
 * ✅ DESIGN : Hero avec gradient-text, Glass-cards pour la méthodologie.
 * ✅ STATS : Section Authority sur fond sombre.
 * ✅ BOUTONS : Effet d'ombre portée lumineuse.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, getFirestore, where, orderBy, getDocs, doc } from 'firebase/firestore';
import Link from 'next/link';
import type { Course, NdaraUser, Settings } from '@/lib/types';
import { Footer } from '@/components/layout/footer';
import Image from 'next/image';
import { Sparkles, ChevronsRight, BookCopy, Wallet, Award, CheckCircle2, Bot, Users, TrendingUp, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CourseCard } from '@/components/cards/CourseCard';
import { DynamicCarousel } from '@/components/ui/DynamicCarousel';
import { useRole } from '@/context/RoleContext';
import { useDoc } from '@/firebase';
import { logTrackingEvent } from '@/actions/trackingActions';
import { useLocale } from 'next-intl';

const LandingNav = ({ logoUrl }: { logoUrl: string }) => {
    const [scrolled, setScrolled] = useState(false);
    const { user, role } = useRole();
    const locale = useLocale();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const dashboardUrl = role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';

    return (
        <nav className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
            scrolled ? "py-2 bg-slate-950/95 backdrop-blur-xl border-b border-white/5 shadow-2xl" : "py-4 bg-transparent"
        )}>
            <div className="container mx-auto px-6 flex justify-between items-center">
                <Link href={`/${locale}`} className="flex items-center gap-3 group">
                    <div className="relative w-9 h-9">
                        <Image 
                            src={logoUrl} 
                            alt="Logo Ndara" 
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

const StatItem = ({ icon: Icon, label, value, color }: any) => (
    <div className="flex flex-col items-center p-6 text-center space-y-2 group">
        <div className={cn("p-3 rounded-2xl bg-white/5 border border-white/10 transition-transform group-hover:scale-110", color)}>
            <Icon className="h-6 w-6" />
        </div>
        <p className="text-3xl font-black text-white">{value}</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{label}</p>
    </div>
);

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

  const coursesByCategory = useMemo(() => {
    const groups: Record<string, Course[]> = {};
    courses.forEach(course => {
      const cat = course.category || "Formations";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(course);
    });
    return groups;
  }, [courses]);

  return (
    <div className="bg-slate-950 text-white min-h-screen font-sans selection:bg-primary/30 bg-grainy">
      <LandingNav logoUrl="/logo.png" />
      
      <div className="container mx-auto">
        {/* --- HERO SECTION FINTECH --- */}
        <header className="text-center pt-28 pb-16 md:pt-40 md:pb-24 max-w-5xl mx-auto space-y-8 px-6">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-5 py-2 rounded-full font-black uppercase text-[10px] tracking-[0.25em] animate-in fade-in duration-1000">
            <Sparkles className="w-3 h-3 mr-2" />
            L'EXCELLENCE PAR LE SAVOIR
          </Badge>
          
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter leading-[1.1] uppercase animate-in slide-in-from-bottom-4 duration-1000">
            <span className="block text-white">{content?.heroTitle || "Le futur de l'Afrique"}</span>
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-400 to-emerald-400">
              se code ici.
            </span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed animate-in fade-in duration-1000 delay-300">
            {content?.heroSubtitle || "Rejoignez la plus grande académie panafricaine et apprenez les compétences du futur avec des experts locaux."}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 animate-in fade-in duration-1000 delay-500">
              <Link href={user ? `/${locale}${dashboardUrl}` : `/${locale}/login?tab=register`}>
                  <button 
                    className="nd-cta-primary h-14 text-[11px] px-12 rounded-2xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all"
                    onClick={() => logTrackingEvent({ eventType: 'cta_click', sessionId: 'landing', pageUrl: '/', metadata: { location: 'hero' } })}
                  >
                      {user ? "Accéder à mon espace" : (content?.heroCtaText || "Démarrer l'aventure")}
                      <ChevronsRight className="ml-2 h-4 w-4" />
                  </button>
              </Link>
              <Link href="/about">
                <Button variant="ghost" className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-white">
                    Notre Manifeste
                </Button>
              </Link>
          </div>
        </header>
          
        <main className="space-y-24 md:space-y-40 pb-32">
          {/* --- CARROUSEL DYNAMIQUE --- */}
          <div className="px-6">
            <DynamicCarousel />
          </div>

          {/* --- SECTION STATISTIQUES (BRAND DARK) --- */}
          <section className="bg-slate-900 border-y border-white/5 py-16 px-6">
            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                <StatItem icon={Users} label="Apprenants" value="50K+" color="text-primary" />
                <StatItem icon={BookCopy} label="Formations" value="120+" color="text-emerald-400" />
                <StatItem icon={Award} label="Certifiés" value="15K+" color="text-amber-400" />
                <StatItem icon={TrendingUp} label="Croissance" value="+25%" color="text-blue-400" />
            </div>
          </section>

          {/* --- METHODOLOGIE GLASS-CARDS --- */}
          <section className="px-6">
            <div className="text-center mb-16 space-y-4">
                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">Une méthodologie <br/><span className="text-primary">éprouvée.</span></h2>
                <p className="text-slate-500 font-medium">Conçu pour l'impact, optimisé pour la réussite.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {[
                    { icon: BookCopy, title: "Savoir Contextualisé", desc: "Des cours pensés pour les réalités économiques et technologiques du continent.", color: "bg-primary/10" },
                    { icon: Wallet, title: "Fintech Ready", desc: "Paiements simplifiés via Mobile Money (MTN, Orange, Wave) et Cartes bancaires.", color: "bg-emerald-500/10" },
                    { icon: Bot, title: "Tuteur IA Mathias", desc: "Un assistant personnel disponible 24h/24 pour corriger vos exercices et répondre à vos questions.", color: "bg-blue-500/10" }
                ].map((feat, i) => (
                    <div key={i} className="group p-8 rounded-[2.5rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl hover:border-primary/30 transition-all duration-500">
                        <div className={cn("p-4 rounded-2xl w-fit mb-6 shadow-xl", feat.color)}>
                            <feat.icon className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="font-bold text-xl text-white uppercase tracking-tight mb-3">{feat.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
                    </div>
                ))}
            </div>
          </section>

          {/* --- CATALOGUE PAR CATÉGORIES --- */}
          <div className="space-y-20 px-6">
              {Object.entries(coursesByCategory).map(([category, catCourses]) => (
                <section key={category} className="space-y-8">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                            <div className="h-8 w-1.5 bg-primary rounded-full shadow-[0_0_15px_hsl(var(--primary))]" />
                            {category}
                        </h2>
                        <Link href={`/${locale}/search?q=${category}`}>
                            <Button variant="ghost" className="text-primary font-black uppercase text-[10px] tracking-widest gap-2">
                                Voir Tout <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                    <Carousel opts={{ align: "start", loop: false }} className="w-full">
                        <CarouselContent className="-ml-4">
                            {catCourses.map(course => (
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
              ))}
          </div>

          {/* --- FINAL CTA --- */}
          <section className="relative py-20 md:py-32 px-8 mx-6 rounded-[3rem] overflow-hidden group">
            <div className="absolute inset-0 bg-primary shadow-[0_0_100px_rgba(59,130,246,0.2)]" />
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative z-10 text-center space-y-10">
                <h2 className="text-3xl md:text-6xl font-black text-white uppercase tracking-tight leading-none">
                    {content?.finalCtaTitle || "Prêt à transformer <br/>votre avenir ?"}
                </h2>
                <Button 
                    size="lg" 
                    asChild 
                    className="h-16 px-12 rounded-2xl bg-white text-primary hover:bg-slate-50 font-black uppercase text-[11px] tracking-[0.25em] shadow-2xl transition-all active:scale-95 w-fit mx-auto"
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
