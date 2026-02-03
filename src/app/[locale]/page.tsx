'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getFirestore, where, orderBy, limit, getDocs, getCountFromServer } from 'firebase/firestore';
import Link from 'next/link';
import type { Course, NdaraUser } from '@/lib/types';
import { Footer } from '@/components/layout/footer';
import Image from 'next/image';
import { Sparkles, Search, BookOpen, Bot, Zap, Trophy, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard } from '@/components/cards/CourseCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DynamicCarousel } from '@/components/ui/DynamicCarousel';
import { useRole } from '@/context/RoleContext';
import { useTranslations } from 'next-intl';

const LandingNav = () => {
    const [scrolled, setScrolled] = useState(false);
    const { user, role } = useRole();
    const t = useTranslations();

    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 10;
            if (isScrolled !== scrolled) {
                setScrolled(isScrolled);
            }
        };
        document.addEventListener('scroll', handleScroll);
        return () => document.removeEventListener('scroll', handleScroll);
    }, [scrolled]);

    return (
        <nav className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
            scrolled ? "py-3 bg-slate-900/90 backdrop-blur-md border-b border-white/10" : "py-6"
        )}>
            <div className="container mx-auto px-4 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-3 group transition-transform hover:scale-105">
                    <Image src="/icon.svg" alt="Ndara Afrique Logo" width={32} height={32} />
                    <span className="text-xl font-bold tracking-tighter text-white">Ndara Afrique</span>
                </Link>
                <div className="flex items-center gap-4">
                    {user ? (
                        <Link href={role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard'}>
                            <Button variant="outline" className="bg-primary/10 border-primary/20 text-white hover:bg-primary/20">
                                {t('Nav.dashboard')}
                            </Button>
                        </Link>
                    ) : (
                        <Link href="/login">
                            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                                {t('Auth.loginButton')}
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

const CourseCounter = () => {
    const [count, setCount] = useState<number | null>(null);
    const db = getFirestore();
    const t = useTranslations('Landing');

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const coll = collection(db, 'courses');
                const q = query(coll, where('status', '==', 'Published'));
                const snapshot = await getCountFromServer(q);
                setCount(snapshot.data().count);
            } catch (error) {
                console.error("Error counting courses:", error);
            }
        };
        fetchCount();
    }, [db]);

    if (count === null) return <Skeleton className="h-4 w-32 bg-slate-800 mx-auto mt-4" />;

    return (
        <p className="text-sm text-primary font-bold mt-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {t('course_count', { count })}
        </p>
    );
};

const FeatureSection = () => {
    const t = useTranslations('Landing');
    const features = [
        { icon: Zap, title: t('feature_1_title'), desc: t('feature_1_desc') },
        { icon: Trophy, title: t('feature_2_title'), desc: t('feature_2_desc') },
        { icon: Bot, title: t('feature_3_title'), desc: t('feature_3_desc') },
    ];

    return (
        <section className="py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f, i) => (
                <Card key={i} className="bg-slate-800/40 border-slate-700/50 hover:border-primary/50 transition-all duration-300 group">
                    <CardHeader>
                        <div className="p-3 bg-primary/10 rounded-xl w-fit group-hover:bg-primary/20 transition-colors">
                            <f.icon className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-xl font-bold text-white mt-4">{f.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                    </CardContent>
                </Card>
            ))}
        </section>
    );
};

export default function LandingPage() {
  const { user, role } = useRole();
  const t = useTranslations('Landing');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
  const db = getFirestore();

  useEffect(() => {
    const q = query(
      collection(db, "courses"),
      where("status", "==", "Published"),
      orderBy("createdAt", "desc"),
      limit(8)
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(coursesData);
      
      if (coursesData.length > 0) {
        const instructorIds = [...new Set(coursesData.map(c => c.instructorId).filter(Boolean))];
        if (instructorIds.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', instructorIds.slice(0, 30)));
            const userSnapshots = await getDocs(usersQuery);
            const newInstructors = new Map<string, Partial<NdaraUser>>();
            userSnapshots.forEach(doc => {
                const userData = doc.data();
                newInstructors.set(userData.uid, { fullName: userData.fullName, profilePictureURL: userData.profilePictureURL });
            });
            setInstructorsMap(newInstructors);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Firebase Error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db]);

  const ctaLink = user ? (role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard') : '/login?tab=register';

  return (
    <div className="bg-slate-950 text-foreground min-h-screen font-sans overflow-x-hidden">
      <LandingNav />
      
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        
        {/* HERO SECTION */}
        <header className="text-center pt-32 pb-16 md:pt-48 md:pb-24 max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-6 py-1.5 px-4 border-primary/30 bg-primary/5 text-primary animate-in fade-in slide-in-from-top-4 duration-1000">
            <Sparkles className="w-4 h-4 mr-2" />
            La plateforme panafricaine de l'apprentissage intelligent
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            {t('hero_title')}
          </h1>
          <p className="text-slate-400 text-lg md:text-xl mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            {t('hero_subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <Link href={ctaLink} className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto h-14 px-10 text-lg font-bold bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 rounded-2xl group">
                      {t('cta_start')}
                      <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
              </Link>
              <Link href="/search" className="w-full sm:w-auto">
                  <Button variant="ghost" size="lg" className="w-full sm:w-auto h-14 px-10 text-lg font-bold text-white hover:bg-white/5 rounded-2xl">
                      <Search className="mr-2 h-5 w-5" />
                      Explorer le catalogue
                  </Button>
              </Link>
          </div>
          <CourseCounter />
        </header>
          
        <main className="space-y-24 pb-24">
          <div className="animate-in fade-in zoom-in-95 duration-1000 delay-500">
            <DynamicCarousel />
          </div>

          <FeatureSection />

          <section>
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-white">Nos dernières formations</h2>
                <Link href="/search" className="text-primary hover:underline text-sm font-bold flex items-center">
                    Voir tout <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
            </div>
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-2xl bg-slate-800" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {courses.map(course => (
                        <CourseCard 
                            key={course.id} 
                            course={course} 
                            instructor={instructorsMap.get(course.instructorId) || null} 
                            variant="catalogue" 
                        />
                    ))}
                </div>
            )}
          </section>

          {/* MATHIAS PROMO SECTION */}
          <section className="bg-gradient-to-br from-primary/20 to-slate-900 border border-primary/20 rounded-[2.5rem] p-8 md:p-16 flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-12 opacity-10">
                  <Bot className="h-64 w-64 text-primary" />
              </div>
              <div className="flex-1 space-y-6 relative z-10 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/30 rounded-full text-primary text-xs font-black uppercase tracking-widest">
                      <Bot className="h-4 w-4" /> Copilote Mathias
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">L'IA au service de votre réussite.</h2>
                  <p className="text-slate-300 text-lg max-w-xl">
                      Besoin d'explication sur un concept flou ? MATHIAS analyse vos cours et vous répond instantanément en Français ou en Sango. Ne restez jamais bloqué.
                  </p>
                  <Button asChild variant="outline" className="h-12 px-8 border-white/20 text-white hover:bg-white/10">
                      <Link href="/login?tab=register">Essayer Mathias maintenant</Link>
                  </Button>
              </div>
              <div className="flex-1 w-full max-w-sm relative aspect-square animate-pulse duration-[4000ms]">
                  <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full"></div>
                  <div className="relative bg-slate-800/50 border border-slate-700 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center"><Bot className="text-white h-6 w-6"/></div>
                          <div className="bg-slate-700 h-2 w-24 rounded"></div>
                      </div>
                      <div className="space-y-3">
                          <div className="bg-primary/10 h-12 w-full rounded-xl border border-primary/20"></div>
                          <div className="bg-slate-700/50 h-8 w-3/4 rounded-xl"></div>
                          <div className="bg-primary/10 h-16 w-full rounded-xl border border-primary/20"></div>
                      </div>
                  </div>
              </div>
          </section>

        </main>
      </div>
      <Footer />
    </div>
  );
};
