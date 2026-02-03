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
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/cards/CourseCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/layout/footer';
import type { Course, NdaraUser } from '@/lib/types';

const FeatureCard = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
  <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-primary/50 transition-all group">
    <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
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
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/30">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image src="/icon.svg" alt="Ndara Logo" width={32} height={32} className="group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold tracking-tighter text-white">Ndara Afrique</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {isUserLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            ) : user ? (
              <Button asChild variant="outline" className="border-slate-700 hover:bg-slate-800">
                <Link href={dashboardLink}>Mon Tableau de bord</Link>
              </Button>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors hidden sm:block">
                  Se connecter
                </Link>
                <Button asChild className="bg-primary hover:bg-primary/90 rounded-full px-6">
                  <Link href="/login?tab=register">S'inscrire</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-30">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-0 right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[100px] rounded-full"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <Badge variant="secondary" className="mb-8 py-1.5 px-4 bg-slate-800 border-slate-700 text-primary-foreground rounded-full font-medium">
            <Sparkles className="w-4 h-4 mr-2 text-yellow-400" />
            L'excellence technologique au service de l'Afrique
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-8 tracking-tight max-w-4xl mx-auto">
            Maîtrisez votre avenir avec <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Ndara Afrique.</span>
          </h1>
          
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Apprenez les métiers de demain avec des experts locaux et bénéficiez de l'aide du 
            <span className="text-white font-bold"> Tuteur MATHIAS</span>, votre guide personnel 24h/24.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="h-14 px-8 text-lg font-bold rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 w-full sm:w-auto">
              <Link href="/search">
                Explorer les cours <Search className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            {!user && (
              <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg font-bold border-slate-700 hover:bg-slate-800 rounded-full w-full sm:w-auto">
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
            desc="Des formations structurées conçues par des professionnels actifs sur le terrain africain."
          />
          <FeatureCard 
            icon={Bot}
            title="IA Tutorat 24/7"
            desc="Ne restez jamais bloqué. MATHIAS répond à toutes vos questions en temps réel, jour et nuit."
          />
          <FeatureCard 
            icon={Award}
            title="Certification Réelle"
            desc="Validez vos acquis par des quiz et obtenez des certificats reconnus pour booster votre carrière."
          />
        </div>
      </section>

      {/* --- POPULAR COURSES --- */}
      <section className="py-24 bg-slate-900/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">Formations Populaires</h2>
              <p className="text-slate-400 mt-2">Découvrez les compétences les plus demandées sur le continent.</p>
            </div>
            <Link href="/search" className="text-primary font-bold flex items-center gap-2 hover:underline group">
              Voir tout le catalogue <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoadingCourses ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-96 w-full rounded-2xl bg-slate-800" />)
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
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                <p className="text-slate-500 text-lg">De nouveaux cours arrivent bientôt !</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- MATHIAS CTA --- */}
      <section className="py-24 container mx-auto px-6">
        <div className="bg-gradient-to-br from-primary/20 to-blue-600/10 border border-primary/20 rounded-3xl p-12 md:p-20 relative overflow-hidden group">
          <div className="absolute top-[-20%] right-[-10%] p-12 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
            <Bot className="h-[400px] w-[400px] text-primary" />
          </div>
          
          <div className="max-w-2xl relative z-10">
            <Badge className="mb-6 bg-primary text-primary-foreground uppercase tracking-widest text-[10px] font-bold">Innovation Pédagogique</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">L'IA au service de votre réussite.</h2>
            <ul className="space-y-4 mb-12">
              {[
                  "Explications claires et adaptées à votre niveau",
                  "Analyse instantanée de vos erreurs aux quiz",
                  "Un mentor disponible même à 3h du matin"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" />
                    <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="h-14 px-8 font-bold rounded-full bg-white text-slate-950 hover:bg-slate-100 transition-colors">
              <Link href="/login?tab=register">Démarrer avec Mathias</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}