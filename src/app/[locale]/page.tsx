
'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getFirestore, where, orderBy, limit, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRole } from '@/context/RoleContext';
import { 
  BookOpen, 
  Bot, 
  Award, 
  ArrowRight, 
  Search, 
  Sparkles, 
  CheckCircle2,
  Loader2,
  Menu,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/cards/CourseCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/layout/footer';
import { logTrackingEvent } from '@/actions/trackingActions';
import type { Course, NdaraUser } from '@/lib/types';
import { MobileMoneySection } from '@/components/landing/MobileMoneySection';
import { Stats } from '@/components/landing/Stats';

export default function LandingPage() {
  const t = useTranslations();
  const { user, role, isUserLoading } = useRole();
  const db = getFirestore();
  
  const [popularCourses, setPopularCourses] = useState<Course[]>([]);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));

  // --- ANALYTICS: Page View ---
  useEffect(() => {
    logTrackingEvent({
      eventType: 'page_view',
      sessionId,
      pageUrl: window.location.href,
      metadata: { device: 'mobile_optimized' }
    });
  }, [sessionId]);

  // --- DATA: Real-time Courses ---
  useEffect(() => {
    const q = query(
      collection(db, "courses"),
      where("status", "==", "Published"),
      orderBy("createdAt", "desc"),
      limit(3)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setPopularCourses(coursesData);
      
      if (coursesData.length > 0) {
        const instructorIds = [...new Set(coursesData.map(c => c.instructorId))];
        const instructorsRef = collection(db, 'users');
        const qInstructors = query(instructorsRef, where('uid', 'in', instructorIds.slice(0, 30)));
        const instructorsSnap = await getDocs(qInstructors);
        
        const newMap = new Map();
        instructorsSnap.forEach(d => newMap.set(d.id, d.data()));
        setInstructorsMap(newMap);
      }
      setIsLoadingCourses(false);
    });

    return () => unsubscribe();
  }, [db]);

  const handleCtaClick = (label: string) => {
    logTrackingEvent({
      eventType: 'cta_click',
      sessionId,
      pageUrl: window.location.href,
      metadata: { label }
    });
  };

  const dashboardLink = role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/30 font-sans">
      
      {/* --- MOBILE NAVBAR --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.svg" alt="Ndara" width={28} height={28} priority />
            <span className="text-lg font-bold tracking-tight text-white">Ndara Afrique</span>
          </Link>
          
          <div className="flex items-center gap-2">
            {isUserLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            ) : user ? (
              <Button asChild size="sm" className="h-9 px-4 text-xs font-bold rounded-full">
                <Link href={dashboardLink}>Mon Espace</Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="h-9 px-4 text-xs font-bold rounded-full bg-primary" onClick={() => handleCtaClick('navbar_signup')}>
                <Link href="/login?tab=register">S'inscrire</Link>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION: Optimized for Android Viewports --- */}
      <section className="relative pt-28 pb-12 px-4 overflow-hidden">
        <div className="text-center space-y-6 relative z-10">
          <Badge variant="outline" className="py-1 px-3 bg-primary/5 border-primary/20 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider">
            🚀 L'Éducation de demain en Afrique
          </Badge>
          
          <h1 className="text-3xl font-extrabold text-white leading-[1.2] tracking-tight">
            Maîtrisez votre avenir <br/>
            <span className="text-primary">avec Ndara Afrique</span>
          </h1>
          
          <p className="text-slate-400 text-base max-w-xs mx-auto leading-relaxed">
            Apprenez avec des experts et profitez du <span className="text-white font-bold">Tuteur MATHIAS</span> disponible 24h/24.
          </p>

          <div className="flex flex-col gap-3 pt-4">
            <Button asChild className="h-14 w-full text-base font-bold rounded-xl bg-primary shadow-lg shadow-primary/20" onClick={() => handleCtaClick('hero_explore')}>
              <Link href="/search">Explorer les cours</Link>
            </Button>
            {!user && (
              <Button asChild variant="ghost" className="h-12 w-full text-slate-300" onClick={() => { handleCtaClick('hero_login'); logTrackingEvent({ eventType: 'cta_click', sessionId, pageUrl: '/', metadata: { action: 'start_signup' } }); }}>
                <Link href="/login">Se connecter</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* --- TRUST & MOBILE MONEY: CRITICAL FOR CONVERSION --- */}
      <section className="px-4 py-8">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center space-y-6">
          <div className="flex items-center justify-center gap-2 text-primary font-bold text-sm">
            <ShieldCheck className="h-5 w-5" />
            <span>Paiement 100% Sécurisé</span>
          </div>
          <p className="text-slate-400 text-sm">Inscrivez-vous instantanément via :</p>
          <MobileMoneySection onTrackClick={(provider) => handleCtaClick(`mobile_money_${provider}`)} />
        </div>
      </section>

      {/* --- STATS DYNAMIQUE --- */}
      <section className="px-4 py-8">
        <Stats />
      </section>

      {/* --- POPULAR COURSES: Horizontal Scroll for Touch --- */}
      <section className="py-12 bg-slate-900/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Formations Populaires</h2>
            <Link href="/search" className="text-xs font-bold text-primary flex items-center gap-1">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-6 snap-x no-scrollbar">
            {isLoadingCourses ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="min-w-[280px] h-80 snap-center">
                  <Skeleton className="w-full h-full rounded-2xl bg-slate-800" />
                </div>
              ))
            ) : popularCourses.length > 0 ? (
              popularCourses.map(course => (
                <div key={course.id} className="min-w-[280px] snap-center">
                  <CourseCard 
                    course={course} 
                    instructor={instructorsMap.get(course.instructorId) || null} 
                    variant="catalogue" 
                  />
                </div>
              ))
            ) : (
              <div className="w-full py-12 text-center border border-dashed border-slate-800 rounded-2xl">
                <p className="text-slate-500 text-sm">Arrivée imminente de nouveaux cours.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- MATHIAS CTA: Mobile Optimized --- */}
      <section className="px-4 py-12">
        <div className="bg-gradient-to-br from-primary/20 to-blue-600/5 border border-primary/20 rounded-3xl p-8 relative overflow-hidden">
          <Bot className="absolute -right-8 -top-8 h-32 w-32 text-primary opacity-10" />
          
          <div className="relative z-10 space-y-6">
            <Badge className="bg-primary/20 text-primary border-none text-[10px] font-bold">INNOVATION</Badge>
            <h2 className="text-2xl font-bold text-white leading-tight">L'IA MATHIAS au service de votre réussite.</h2>
            <ul className="space-y-3">
              {[
                  "Réponses claires 24h/24",
                  "Aide personnalisée aux quiz",
                  "Mentorat à chaque étape"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-300 text-sm">
                    <CheckCircle2 className="text-primary h-4 w-4" />
                    <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="h-14 w-full font-bold rounded-xl bg-white text-slate-950 hover:bg-slate-100" onClick={() => handleCtaClick('mathias_start')}>
              <Link href="/login?tab=register">Essayer avec Mathias</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* --- ACCESSIBILITY BAR: For Android Users --- */}
      <section className="px-4 pb-12">
        <div className="flex items-center gap-4 p-4 bg-slate-900/30 rounded-xl border border-slate-800/50">
            <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-slate-400" />
            </div>
            <div className="flex-1">
                <p className="text-xs font-bold text-slate-300">Compatible tout smartphone</p>
                <p className="text-[10px] text-slate-500">Optimisé pour les connexions bas débit en Afrique.</p>
            </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
