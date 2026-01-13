
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';
import Image from 'next/image';
import { getFirestore, collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import type { Course } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Frown } from 'lucide-react';
import { LanguageSelector } from '@/components/layout/language-selector';

const CourseCard = ({ course, instructor }: { course: Course, instructor: FormaAfriqueUser | null }) => (
  <div className="benefit-card group flex flex-col">
    <div className="relative h-48 rounded-lg overflow-hidden mb-6">
      <Image
        src={course.imageUrl || `https://picsum.photos/seed/${course.id}/600/400`}
        alt={course.title}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-300"
      />
    </div>
    <div className="flex-grow">
      <span className="bg-blue-600/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase">
        {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'Gratuit'}
      </span>
      <h3 className="text-xl font-semibold mt-4 mb-2 text-white">{course.title}</h3>
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{course.description}</p>
    </div>
    <Button asChild className="w-full mt-4 bg-white/10 hover:bg-blue-600 rounded-xl font-medium transition-colors">
      <Link href={`/course/${course.id}`}>Consulter</Link>
    </Button>
  </div>
);

const LandingPage = () => {
  const [publicCourses, setPublicCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Map<string, FormaAfriqueUser>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    const q = query(collection(db, 'courses'), where('status', '==', 'Published'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setPublicCourses(coursesData);

      if (coursesData.length > 0) {
        const instructorIds = [...new Set(coursesData.map(c => c.instructorId))];
        if (instructorIds.length > 0) {
            const instructorsQuery = query(collection(db, 'users'), where('uid', 'in', instructorIds.slice(0, 30)));
            const instructorSnapshots = await getDocs(instructorsQuery);
            const instructorsMap = new Map<string, FormaAfriqueUser>();
            instructorSnapshots.forEach(doc => {
              instructorsMap.set(doc.data().uid, doc.data() as FormaAfriqueUser);
            });
            setInstructors(instructorsMap);
        }
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching public courses: ", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

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
          Rejoignez la première plateforme panafricaine dédiée aux métiers de demain. Apprenez, pratiquez et certifiez vos compétences.
        </p>
        <Button asChild size="lg" className="px-8 py-4 h-auto bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105 hero-text" style={{ animationDelay: '0.4s' }}>
           <Link href="/login?tab=register">Commencer l'inscription</Link>
        </Button>
      </main>

      <section className="py-20 max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold mb-2">Explorez nos formations</h2>
          </div>
          <Link href="/search" className="text-blue-400 hover:text-blue-300 font-medium transition">
            Voir tout →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="benefit-card"><Skeleton className="h-full w-full bg-slate-800" /></div>
            ))
          ) : publicCourses.length > 0 ? (
            publicCourses.slice(0, 3).map((course) => (
              <CourseCard key={course.id} course={course} instructor={instructors.get(course.instructorId) || null} />
            ))
          ) : (
             <div className="md:col-span-3 text-center py-16 benefit-card">
              <Frown className="mx-auto h-12 w-12 text-slate-500" />
              <h3 className="mt-4 text-lg font-semibold text-slate-300">De nouveaux cours arrivent bientôt.</h3>
              <p className="mt-1 text-sm text-slate-400">Revenez plus tard pour découvrir nos formations.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
