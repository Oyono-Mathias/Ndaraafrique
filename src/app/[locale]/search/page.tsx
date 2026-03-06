'use client';

/**
 * @fileOverview Page de recherche de formations Ndara Afrique (Android-First).
 * ✅ FILTRAGE EN MÉMOIRE : Garantit que les résultats s'affichent même sans index Firestore.
 * ✅ STYLE : Utilise le format GRID (Udemy style).
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, Frown, Sparkles } from 'lucide-react';
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
        
        const newMap = new Map();
        for (let i = 0; i < instructorIds.length; i += 30) {
            const chunk = instructorIds.slice(i, i + 30);
            const qInstructors = query(instructorsRef, where('uid', 'in', chunk));
            const instructorsSnap = await getDocs(qInstructors);
            instructorsSnap.forEach(d => newMap.set(d.id, d.data()));
        }
        setInstructorsMap(newMap);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Erreur Firebase Search:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  const filteredCourses = useMemo(() => {
    const list = courses.filter(c => 
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return list.sort((a, b) => {
        const dateA = (a.createdAt as any)?.toDate?.() || new Date(0);
        const dateB = (b.createdAt as any)?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
    });
  }, [courses, searchTerm]);

  return (
    <div className="space-y-8 pb-24 bg-background min-h-screen">
      <header className="px-4 pt-8 space-y-4">
        <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Catalogue Ndara</span>
        </div>
        <h1 className="text-3xl font-black text-foreground leading-tight uppercase tracking-tight">Que voulez-vous <br/><span className="text-primary">apprendre ?</span></h1>
        
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Saisissez un domaine, un sujet..."
            className="h-14 pl-12 rounded-2xl shadow-xl focus-visible:ring-primary/30"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="px-4">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-80 w-full rounded-[2rem]" />
            ))}
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-700">
            {filteredCourses.map(course => (
              <CourseCard 
                key={course.id} 
                course={course} 
                instructor={instructorsMap.get(course.instructorId) || null}
                variant="grid" 
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-[2.5rem] border-2 border-dashed border-border animate-in zoom-in duration-500">
            <Frown className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Aucun résultat</h3>
            <p className="text-muted-foreground mt-2 max-w-[250px] mx-auto font-medium">
              Nous n'avons pas trouvé de cours correspondant à votre recherche.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
