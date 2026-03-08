'use client';

/**
 * @fileOverview Landing Page Ndara Afrique - Style Udemy Premium.
 * ✅ DESIGN : Grilles de cours horizontales et sections thématiques.
 */

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { collection, query, onSnapshot, getFirestore, where, orderBy, getDocs, doc } from 'firebase/firestore';
import Link from 'next/link';
import type { Course, NdaraUser, Settings } from '@/lib/types';
import Image from 'next/image';
import { ChevronsRight, Menu, X, PlayCircle, BadgeEuro, LayoutDashboard, Star, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/cards/CourseCard';
import { useRole } from '@/context/RoleContext';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useDoc } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Chargement dynamique
const Stats = dynamic(() => import('@/components/landing/Stats').then(mod => mod.Stats), { ssr: false });
const TestimonialsSection = dynamic(() => import('@/components/landing/TestimonialsSection').then(mod => mod.TestimonialsSection), { ssr: false });
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
        <nav className="fixed w-full z-50 bg-[#1C1D1F] border-b border-white/5 h-16 flex items-center">
            <div className="max-w-7xl mx-auto px-4 w-full flex justify-between items-center">
                <Link href={`/${locale}`} className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center text-white font-bold shadow-lg">N</div>
                    <span className="text-xl font-black text-white tracking-tighter uppercase">Ndara</span>
                </Link>
                
                <div className="hidden md:flex space-x-8 items-center">
                    <Link href={`/${locale}/search`} className="text-slate-300 hover:text-white font-bold transition text-sm">Explorer</Link>
                    <Link href={`/${locale}/investir`} className="text-slate-300 hover:text-white font-bold transition text-sm">Bourse</Link>
                    <Link href={`/${locale}/abonnements`} className="text-slate-300 hover:text-white font-bold transition text-sm">Tarifs</Link>
                </div>

                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <Link href={`/${locale}${dashboardUrl}`} className="text-white font-bold text-sm hover:text-primary transition">Mon Espace</Link>
                            <Avatar className="h-8 w-8 border border-white/10">
                                <AvatarImage src={currentUser?.profilePictureURL} className="object-cover" />
                                <AvatarFallback className="bg-slate-800 text-white font-bold">{currentUser?.fullName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href={`/${locale}/login`} className="text-sm font-bold text-white px-4 py-2 hover:bg-white/5 rounded-sm transition">Connexion</Link>
                            <Link href={`/${locale}/login?tab=register`} className="bg-white text-black px-4 py-2 rounded-sm text-sm font-bold hover:bg-slate-200 transition">S'inscrire</Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default function LandingPage() {
  const router = useRouter();
  const db = getFirestore();
  const locale = useLocale();
  const { user, role } = useRole();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());

  const settingsRef = useMemo(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings } = useDoc<Settings>(settingsRef);

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
      } finally { setLoading(false); }
    });
    return () => unsubscribe();
  }, [db]);

  const categories = ["Développement", "Business", "Marketing", "Finance"];

  return (
    <div className="bg-[#1C1D1F] text-white min-h-screen">
      <Navbar />
      
      <section className="pt-32 pb-16 px-4 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl font-black leading-tight uppercase tracking-tighter">
                Apprenez avec <br/><span className="text-primary">les meilleurs</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-lg font-medium">
                Rejoignez 500 000+ apprenants. Découvrez des cours conçus par des experts pour propulser votre carrière en Afrique.
            </p>
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Que souhaitez-vous apprendre ?" 
                    className="w-full h-14 pl-12 pr-4 bg-white text-black rounded-sm font-medium focus:outline-none"
                    onClick={() => router.push('/search')}
                />
            </div>
        </div>
        <div className="relative aspect-video rounded-md overflow-hidden shadow-2xl border border-white/5">
            <Image src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop" alt="Hero" fill className="object-cover" />
        </div>
      </section>

      <section className="py-12 border-y border-white/5 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4">
            <Stats />
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-20 space-y-24">
        {categories.map(cat => {
            const catCourses = courses.filter(c => c.category === cat || (!c.category && cat === "Développement")).slice(0, 4);
            if (catCourses.length === 0) return null;
            
            return (
                <section key={cat} className="space-y-6">
                    <h2 className="text-2xl font-black uppercase tracking-tight">Meilleurs cours en <span className="text-primary">{cat}</span></h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {catCourses.map(course => (
                            <CourseCard 
                                key={course.id} 
                                course={course} 
                                instructor={instructorsMap.get(course.instructorId) || null} 
                                variant="grid" 
                            />
                        ))}
                    </div>
                </section>
            );
        })}
      </main>

      <TestimonialsSection />
      <Footer />
    </div>
  );
}