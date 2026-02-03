
'use client';

/**
 * @fileOverview Liste des cours de l'étudiant optimisée Android.
 * Filtres rapides et cartes larges pour une manipulation tactile aisée.
 */

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, getDocs, documentId, onSnapshot } from 'firebase/firestore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CourseCard } from '@/components/cards/CourseCard';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Search, Frown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Course, Enrollment } from '@/lib/types';

export default function StudentCoursesAndroid() {
  const { currentUser } = useRole();
  const db = getFirestore();
  const [courses, setCourses] = useState<(Course & { progress: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!currentUser?.uid) return;

    setIsLoading(true);
    const enrollQuery = query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid));

    // Écoute temps réel des inscriptions
    const unsubscribe = onSnapshot(enrollQuery, async (snap) => {
      if (snap.empty) {
        setCourses([]);
        setIsLoading(false);
        return;
      }

      const enrollments = snap.docs.map(d => d.data() as Enrollment);
      const courseIds = enrollments.map(e => e.courseId);

      // Récupération des détails des cours
      const coursesRef = collection(db, 'courses');
      const q = query(coursesRef, where(documentId(), 'in', courseIds.slice(0, 30)));
      const courseSnap = await getDocs(q);
      
      const courseData = courseSnap.docs.map(doc => {
        const enrollment = enrollments.find(e => e.courseId === doc.id);
        return {
          id: doc.id,
          ...(doc.data() as Course),
          progress: enrollment?.progress || 0
        };
      });

      setCourses(courseData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, db]);

  const filteredCourses = useMemo(() => {
    return courses.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [courses, searchTerm]);

  const inProgress = filteredCourses.filter(c => c.progress < 100);
  const completed = filteredCourses.filter(c => c.progress === 100);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header className="px-4 pt-6 space-y-4">
        <h1 className="text-2xl font-black text-white">Mes Formations</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Rechercher un cours..." 
            className="pl-10 bg-slate-900 border-slate-800 h-12 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full bg-transparent border-b border-slate-800 rounded-none h-12 p-0 px-4 justify-start gap-6">
          <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-0 font-bold text-xs uppercase tracking-widest text-slate-500">Tous</TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-0 font-bold text-xs uppercase tracking-widest text-slate-500">En cours</TabsTrigger>
          <TabsTrigger value="done" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-0 font-bold text-xs uppercase tracking-widest text-slate-500">Finis</TabsTrigger>
        </TabsList>

        <div className="px-4 mt-6">
          <TabsContent value="all" className="m-0">
            <CoursesGrid courses={filteredCourses} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="active" className="m-0">
            <CoursesGrid courses={inProgress} isLoading={isLoading} emptyMessage="Aucun cours en cours." />
          </TabsContent>
          <TabsContent value="done" className="m-0">
            <CoursesGrid courses={completed} isLoading={isLoading} emptyMessage="Vous n'avez pas encore fini de cours." />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function CoursesGrid({ courses, isLoading, emptyMessage = "Vous n'êtes inscrit à aucun cours." }: { courses: any[], isLoading: boolean, emptyMessage?: string }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-2xl bg-slate-800" />)}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
        <Frown className="h-12 w-12 mb-4 opacity-20" />
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {courses.map(course => (
        <CourseCard key={course.id} course={course} instructor={null} variant="student" />
      ))}
    </div>
  );
}
