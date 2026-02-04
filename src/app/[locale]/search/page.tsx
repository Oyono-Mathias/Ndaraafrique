
'use client';

/**
 * @fileOverview Page de recherche de formations opérationnelle.
 * Connectée à Firestore pour afficher les cours publiés en temps réel.
 * Design Android-First et Vintage.
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, BookOpen, Frown, Loader2 } from 'lucide-react';
import { CourseCard } from '@/components/cards/CourseCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { Course, NdaraUser } from '@/lib/types';

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    setIsLoading(true);
    const q = query(
      collection(db, "courses"),
      where("status", "==", "Published")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(coursesData);
      
      if (coursesData.length > 0) {
        const instructorIds = [...new Set(coursesData.map(c => c.instructorId))];
        const instructorsRef = collection(db, 'users');
        // Fetch instructors in chunks if more than 30
        const qInstructors = query(instructorsRef, where('uid', 'in', instructorIds.slice(0, 30)));
        const instructorsSnap = await getDocs(qInstructors);
        
        const newMap = new Map();
        instructorsSnap.forEach(d => newMap.set(d.id, d.data()));
        setInstructorsMap(newMap);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  const filteredCourses = useMemo(() => {
    return courses.filter(c => 
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [courses, searchTerm]);

  return (
    <div className="space-y-8 pb-24 bg-slate-950 min-h-screen">
      <header className="px-4 pt-8 space-y-4">
        <h1 className="text-3xl font-black text-white">Explorer</h1>
        <p className="text-slate-400 text-sm">Trouvez la formation qui propulsera votre carrière.</p>
        
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <Input
            placeholder="Que voulez-vous apprendre ?"
            className="h-14 pl-12 bg-slate-900 border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus-visible:ring-[#CC7722]/30"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="px-4">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-80 w-full rounded-2xl bg-slate-900" />
            ))}
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map(course => (
              <CourseCard 
                key={course.id} 
                course={course} 
                instructor={instructorsMap.get(course.instructorId) || null}
                variant="catalogue" 
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800">
            <Frown className="h-16 w-16 text-slate-700 mb-4" />
            <h3 className="text-xl font-bold text-white">Aucun résultat</h3>
            <p className="text-slate-500 mt-2 max-w-[250px] mx-auto">
              Désolé, nous n'avons pas trouvé de cours correspondant à "{searchTerm}".
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
