
'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getFirestore, where, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { CourseCard } from '@/components/cards/CourseCard';
import type { Course } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { getDocs } from 'firebase/firestore';
import { Footer } from '@/components/layout/footer';
import Image from 'next/image';

const CourseCarousel = ({ title, courses, instructorsMap, isLoading }: { title: string, courses: Course[], instructorsMap: Map<string, Partial<FormaAfriqueUser>>, isLoading: boolean }) => {
    if (isLoading) {
        return (
            <div>
                <h2 className="text-3xl font-bold mb-12 text-center text-white">{title}</h2>
                <div className="text-center py-10 text-blue-400 animate-pulse">Chargement des cours...</div>
            </div>
        );
    }
    if (!courses || courses.length === 0) {
        return null; // Don't render the section if there are no courses
    }
    return (
        <section className="py-16 max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold mb-12 text-center text-white">{title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {courses.map(course => (
                    <CourseCard key={course.id} course={course} instructor={instructorsMap.get(course.instructorId) || null} />
                ))}
            </div>
        </section>
    );
};


export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<FormaAfriqueUser>>>(new Map());

  const db = getFirestore();

  useEffect(() => {
    const q = query(
      collection(db, "courses"),
      where("status", "==", "Published"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(coursesData);
      
      if (coursesData.length > 0) {
        const instructorIds = [...new Set(coursesData.map(c => c.instructorId).filter(Boolean))];
        if (instructorIds.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', instructorIds.slice(0, 30)));
            const userSnapshots = await getDocs(usersQuery);
            const newInstructors = new Map<string, Partial<FormaAfriqueUser>>();
            userSnapshots.forEach(doc => {
                const userData = doc.data();
                newInstructors.set(userData.uid, { fullName: userData.fullName });
            });
            setInstructorsMap(newInstructors);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Erreur Firebase:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db]);

  const steps = [
    { id: 1, title: "Inscription", desc: "Créez votre compte Ndara en quelques secondes pour commencer." },
    { id: 2, title: "Choix du parcours", desc: "Explorez nos formations en IA, E-commerce ou Design." },
    { id: 3, title: "Certification", desc: "Apprenez à votre rythme et obtenez un diplôme reconnu." }
  ];

  const popularCourses = courses.filter(c => c.isPopular).slice(0, 3);

  return (
    <div className="bg-[#020617] text-white min-h-screen font-sans">
      <nav className="flex justify-between items-center p-6 border-b border-white/10 sticky top-0 bg-[#020617]/90 backdrop-blur-md z-50">
        <Link href="/" className="flex items-center gap-3">
            <Image src="/icon.svg" alt="Ndara Afrique Logo" width={32} height={32} className="h-8 md:h-10 w-auto" />
            <span className="text-2xl font-bold tracking-tighter hidden md:block">Ndara Afrique</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/login">
            <button className="px-5 py-2 border border-white/20 rounded-lg hover:bg-white/10 transition font-medium text-sm">
              Se connecter
            </button>
          </Link>
        </div>
      </nav>

      <header className="text-center py-24 px-6">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight">
          L'excellence numérique <br/><span className="text-blue-500 font-black">pour l'Afrique</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light">
          La première plateforme d'apprentissage panafricaine pour les métiers de demain.
        </p>
        <Link href="/register">
          <button className="px-10 py-4 bg-blue-600 rounded-full font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-all">
            Commencer l'inscription
          </button>
        </Link>
      </header>

      <section className="py-16 max-w-4xl mx-auto px-6">
        <div className="flex justify-center gap-4 mb-10">
          {steps.map((s) => (
            <button 
              key={s.id}
              onClick={() => setActiveStep(s.id)}
              className={`px-8 py-3 rounded-xl border-2 transition-all duration-300 font-bold ${
                activeStep === s.id 
                ? "border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)] text-white" 
                : "border-white/5 bg-white/5 hover:border-white/20 text-gray-500"
              }`}
            >
              Setup {s.id}
            </button>
          ))}
        </div>
        <div className="bg-white/5 p-10 rounded-3xl border border-white/10 text-center backdrop-blur-sm animate-in fade-in duration-700">
          <h3 className="text-3xl font-bold mb-4 text-blue-400">{steps[activeStep-1].title}</h3>
          <p className="text-gray-300 text-lg leading-relaxed">{steps[activeStep-1].desc}</p>
        </div>
      </section>

      <CourseCarousel
        title="Explorez nos cours populaires"
        courses={popularCourses}
        instructorsMap={instructorsMap}
        isLoading={loading}
      />
      
      <Footer />
    </div>
  );
};
