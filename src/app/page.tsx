
'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getFirestore, where, orderBy, limit } from 'firebase/firestore';
import Link from 'next/link';
import { CourseCard } from '@/components/cards/CourseCard';
import type { Course } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { getDocs } from 'firebase/firestore';
import { Footer } from '@/components/layout/footer';
import Image from 'next/image';
import { Frown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';

const CourseCarousel = ({ title, courses, instructorsMap, isLoading }: { title: string, courses: Course[], instructorsMap: Map<string, Partial<FormaAfriqueUser>>, isLoading: boolean }) => {
    if (isLoading && courses.length === 0) {
        return (
            <div className="w-full">
                <div className="nd-skeleton h-8 w-1/3 mb-8"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="nd-skeleton h-80 rounded-xl"></div>
                    <div className="nd-skeleton h-80 rounded-xl"></div>
                    <div className="nd-skeleton h-80 rounded-xl"></div>
                </div>
            </div>
        );
    }
    if (!courses || courses.length === 0) {
        return null;
    }
    return (
        <section className="py-12">
            <h2 className="text-3xl font-bold mb-8 text-foreground">{title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {courses.map(course => (
                    <CourseCard key={course.id} course={course} instructor={instructorsMap.get(course.instructorId) || null} />
                ))}
            </div>
        </section>
    );
};


export default function LandingPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<FormaAfriqueUser>>>(new Map());

  const db = getFirestore();

  useEffect(() => {
    const q = query(
      collection(db, "courses"),
      where("status", "==", "Published"),
      orderBy("createdAt", "desc"),
      limit(6)
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
  
  const popularCourses = courses.filter(c => c.isPopular).slice(0, 3);
  const freeCourses = courses.filter(c => c.price === 0).slice(0,3);

  return (
    <div className="bg-background text-foreground min-h-screen font-sans">
      <div className="container mx-auto px-6">
        <nav className="flex justify-between items-center py-6 border-b">
          <Link href="/" className="flex items-center gap-3 group transition-transform hover:scale-105">
              <Image src="/icon.svg" alt="Ndara Afrique Logo" width={32} height={32} />
              <span className="text-2xl font-bold tracking-tighter">Ndara Afrique</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/search" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Explorer les cours
            </Link>
            <Link href="/login" className="nd-cta-secondary">
              Se connecter
            </Link>
          </div>
        </nav>

        <header className="text-center py-24 md:py-32">
          <Badge variant="outline" className="mb-4 border-primary/50 text-primary animate-fade-in-up">
            <Sparkles className="w-3 h-3 mr-2" />
            La plateforme N°1 pour les compétences du futur en Afrique
          </Badge>
          <h1 className="nd-hero animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Apprenez. Construisez. Prospérez.
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mt-6 mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Des formations de pointe conçues par des experts africains, pour les talents africains. Passez au niveau supérieur.
          </p>
          <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Link href="/login?tab=register">
                  <button className="nd-cta-primary">
                      Démarrer mon parcours
                  </button>
              </Link>
          </div>
        </header>
          
        <main className="space-y-16">
           <CourseCarousel
            title="Populaires ce mois-ci"
            courses={popularCourses.length > 0 ? popularCourses : courses}
            instructorsMap={instructorsMap}
            isLoading={loading}
          />
          
          <CourseCarousel
            title="Découvrir gratuitement"
            courses={freeCourses}
            instructorsMap={instructorsMap}
            isLoading={loading}
          />
        </main>
      </div>
      <Footer />
    </div>
  );
};
