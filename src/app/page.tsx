
'use client';

import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot, orderBy, getDocs, limit } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Frown } from 'lucide-react';
import { LanguageSelector } from '@/components/layout/language-selector';
import type { Course } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { CourseCard } from '@/components/cards/CourseCard';
import { Footer } from '@/components/layout/footer';

const LandingPage = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<FormaAfriqueUser>>>(new Map());
  const [loading, setLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    const q = query(collection(db, "courses"), where("status", "==", "Published"), orderBy("createdAt", "desc"), limit(3));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(coursesData);
      
      if (coursesData.length > 0) {
        const instructorIds = [...new Set(coursesData.map(c => c.instructorId))];
        const instructorsQuery = query(collection(db, 'users'), where('uid', 'in', instructorIds.slice(0, 30)));
        const instructorSnapshots = await getDocs(instructorsQuery);
        const newInstructorsMap = new Map<string, Partial<FormaAfriqueUser>>();
        instructorSnapshots.forEach(doc => {
          newInstructorsMap.set(doc.data().uid, doc.data() as FormaAfriqueUser);
        });
        setInstructorsMap(newInstructorsMap);
      }

      setLoading(false);
    }, (error) => {
      console.error("Error fetching courses: ", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db]);

  const steps = [
    { id: 1, title: "Inscription", desc: "Créez votre compte Ndara en quelques secondes." },
    { id: 2, title: "Choix du parcours", desc: "Explorez nos formations en IA, Design ou Code." },
    { id: 3, title: "Certification", desc: "Apprenez et obtenez un certificat reconnu." }
  ];

  return (
    <div className="bg-[#020617] text-white min-h-screen font-sans">
      <nav className="flex justify-between items-center p-6 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="text-2xl font-bold tracking-tighter">Ndara Afrique</div>
        <div className="flex items-center gap-6">
          <LanguageSelector />
          <Button asChild variant="outline" className="px-4 py-2 text-sm font-medium rounded-lg bg-transparent border-white/20 hover:bg-white/10 hover:text-white transition">
            <Link href="/login">Se connecter</Link>
          </Button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-20 pb-10 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight hero-text">
          L'excellence numérique <br />
          <span className="text-blue-500">pour l'Afrique</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 hero-text" style={{ animationDelay: '0.2s' }}>
          La première plateforme d'apprentissage panafricaine pour les métiers de demain.
        </p>
        <Button asChild size="lg" className="px-8 py-4 h-auto bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105 hero-text" style={{ animationDelay: '0.4s' }}>
           <Link href="/register">Commencer l'inscription</Link>
        </Button>
      </main>

      <section className="py-16 px-6 max-w-4xl mx-auto">
        <div className="flex justify-center gap-4 mb-10">
          {steps.map((s) => (
            <button 
              key={s.id}
              onClick={() => setActiveStep(s.id)}
              className={`px-6 py-2 rounded-full border-2 transition-all duration-300 ${activeStep === s.id ? "border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/50" : "bg-white/5 border-white/10"}`}
            >
              Setup {s.id}
            </button>
          ))}
        </div>
        <div className="bg-white/5 p-8 rounded-3xl border border-white/10 text-center">
          <h3 className="text-2xl font-bold mb-4 text-blue-400">{steps[activeStep-1].title}</h3>
          <p className="text-gray-300">{steps[activeStep-1].desc}</p>
        </div>
      </section>

      <section className="py-20 max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-end mb-10">
            <div>
                <h2 className="text-3xl font-bold mb-2">Explorez nos formations</h2>
                <p className="text-gray-400">Découvrez un aperçu de nos formations les plus populaires.</p>
            </div>
            <Link href="/search" className="text-blue-400 hover:text-blue-300 font-medium transition whitespace-nowrap">
                Voir tout →
            </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {loading ? (
                [...Array(3)].map((_, i) => (
                    <div key={i} className="benefit-card"><Skeleton className="h-full w-full bg-slate-800" /></div>
                ))
            ) : courses.length > 0 ? courses.map(course => (
              <CourseCard key={course.id} course={course} instructor={instructorsMap.get(course.instructorId) || null} />
            )) : (
                <div className="col-span-3">
                    <div className="text-center py-10 px-4 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/20">
                        <Frown className="mx-auto h-10 w-10 text-slate-500" />
                        <h3 className="mt-2 text-md font-semibold text-slate-300">Nos formations arrivent bientôt.</h3>
                    </div>
                </div>
            )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
