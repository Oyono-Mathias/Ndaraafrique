
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
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/cards/CourseCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/layout/footer';
import type { Course, NdaraUser } from '@/lib/types';

const FeatureCard = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
  <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl hover:border-primary/50 transition-all duration-300 group">
    <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
      <Icon className="h-6 w-6 text-primary" />
    </div>
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </div>
);

export default function LandingPage() {
  const t = useTranslations();
  const { user, role, isUserLoading } = useRole();
  const db = getFirestore();
  
  const [popularCourses, setPopularCourses] = useState<Course[]>([]);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  useEffect(() => {
    // Récupérer les 3 cours les plus récents
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

  const dashboardLink = role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';

  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-primary/30">
      
      {/* --- NAVBAR LIGHT --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image src="/icon.svg" alt="Ndara Logo" width={36} height={32} className="group-hover:scale-110 transition-transform" />
            <span className="text-xl font-black tracking-tighter text-white">NDARA AFRIQUE</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {isUserLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            ) : user ? (
              <Button asChild variant="outline" className="border-white/10 hover:bg-white/5 text-white rounded-xl">
                <Link href={dashboardLink}>{t('Nav.dashboard')}</Link>
              </Button>
            ) : (
              <>
                <Link href="/login" className="text-sm font-bold text-slate-400 hover:text-white transition-colors hidden sm:block">
                  {t('Auth.loginButton')}
                </Link>
                <Button asChild className="bg-primary hover:bg-primary/90 rounded-xl px-6">
                  <Link href="/login?tab=register">{t('Auth.registerButton')}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-0 right-[-5%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <Badge variant="outline" className="mb-8 py-2 px-4 border-primary/30 bg-primary/5 text-primary rounded-full animate-in fade-in slide-in-from-top-4 duration-1000">
            <Sparkles className="w-4 h-4 mr-2" />
            L'excellence technologique au service de l'Afrique
          </Badge>
          
          <h1 className="text-5xl md:text-8xl font-black text-white leading-[1.1] mb-8 tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
            Maîtrisez votre avenir avec <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-emerald-400">Ndara Afrique.</span>
          </h1>
          
          <p className="text-slate-400 text-lg md:text-2xl max-w-3xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Apprenez les métiers de demain avec des experts du continent et bénéficiez de l'aide 24h/24 du 
            <span className="text-white font-bold"> Tuteur MATHIAS</span>, votre coach IA personnel.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <Button asChild size="lg" className="h-16 px-10 text-lg font-black rounded-2xl bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 w-full sm:w-auto">
              <Link href="/search">
                Explorer les cours <Search className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            {!user && (
              <Button asChild variant="outline" size="lg" className="h-16 px-10 text-lg font-bold border-white/10 hover:bg-white/5 text-white rounded-2xl w-full sm:w-auto">
                <Link href="/login?tab=register">Commencer gratuitement</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section className="py-24 container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={BookOpen}
            title="Contenu Expert"
            desc="Des formations structurées et pragmatiques conçues par des professionnels actifs sur le terrain africain."
          />
          <FeatureCard 
            icon={Bot}
            title="IA Tutorat 24/7"
            desc="Ne restez jamais bloqué. MATHIAS analyse vos cours et répond à toutes vos questions en temps réel."
          />
          <FeatureCard 
            icon={Award}
            title="Certification Réelle"
            desc="Validez vos acquis par des quiz rigoureux et obtenez des certificats reconnus pour booster votre carrière."
          />
        </div>
      </section>

      {/* --- POPULAR COURSES --- */}
      <section className="py-24 bg-slate-900/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-black text-white">Formations Populaires</h2>
              <p className="text-slate-400 text-lg">Découvrez les compétences les plus demandées actuellement.</p>
            </div>
            <Link href="/search" className="text-primary font-bold flex items-center gap-2 hover:underline group">
              Voir tout le catalogue <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoadingCourses ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-96 w-full rounded-3xl bg-slate-900" />)
            ) : popularCourses.length > 0 ? (
              popularCourses.map(course => (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  instructor={instructorsMap.get(course.instructorId) || null} 
                  variant="catalogue" 
                />
              ))
            ) : (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                <p className="text-slate-500">De nouveaux cours arrivent très bientôt !</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- MATHIAS CTA --- */}
      <section className="py-24 container mx-auto px-6">
        <div className="bg-gradient-to-br from-primary/20 to-slate-900 border border-primary/20 rounded-[3rem] p-12 md:p-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <Bot className="h-80 w-80 text-primary" />
          </div>
          
          <div className="max-w-2xl relative z-10">
            <Badge className="mb-6 bg-primary text-white hover:bg-primary rounded-full px-4 py-1">Exclusivité Ndara</Badge>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 leading-tight">L'intelligence artificielle au service de votre réussite.</h2>
            <ul className="space-y-4 mb-10">
              <li className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 className="text-emerald-400 h-6 w-6" />
                <span>Explications instantanées sur les concepts complexes</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 className="text-emerald-400 h-6 w-6" />
                <span>Disponible en Français et en Sango</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 className="text-emerald-400 h-6 w-6" />
                <span>Coach personnel disponible même à 3h du matin</span>
              </li>
            </ul>
            <Button asChild size="lg" className="h-14 px-8 font-bold rounded-2xl">
              <Link href="/login?tab=register">Démarrer avec Mathias</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
