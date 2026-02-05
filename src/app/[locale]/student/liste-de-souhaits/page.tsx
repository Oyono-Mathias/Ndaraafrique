'use client';

/**
 * @fileOverview Page Liste de Souhaits opérationnelle.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, onSnapshot, query, getDocs, documentId, where } from 'firebase/firestore';
import { CourseCard } from '@/components/cards/CourseCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Course, NdaraUser } from '@/lib/types';

export default function ListeSouhaitsPage() {
  const { currentUser } = useRole();
  const db = getFirestore();
  const [wishlistCourses, setWishlistCourses] = useState<Course[]>([]);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    setIsLoading(true);
    const wishlistRef = collection(db, `users/${currentUser.uid}/wishlist`);
    
    const unsubscribe = onSnapshot(wishlistRef, async (snap) => {
      if (snap.empty) {
        setWishlistCourses([]);
        setIsLoading(false);
        return;
      }

      const courseIds = snap.docs.map(doc => doc.id);
      const coursesQuery = query(collection(db, 'courses'), where(documentId(), 'in', courseIds.slice(0, 30)));
      const coursesSnap = await getDocs(coursesQuery);
      const coursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      
      setWishlistCourses(coursesData);

      if (coursesData.length > 0) {
        const instructorIds = [...new Set(coursesData.map(c => c.instructorId))];
        const instructorsSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', instructorIds.slice(0, 30))));
        const newMap = new Map();
        instructorsSnap.forEach(d => newMap.set(d.id, d.data()));
        setInstructorsMap(newMap);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, db]);

  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen bg-grainy">
      <header className="px-4 pt-8">
        <div className="flex items-center gap-2 text-primary mb-2">
            <Heart className="h-5 w-5 fill-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Favoris</span>
        </div>
        <h1 className="text-3xl font-black text-white leading-tight">Ma Liste de <br/><span className="text-primary">Souhaits</span></h1>
        <p className="text-slate-500 text-sm mt-2 font-medium">Retrouvez les formations qui vous ont fait craquer.</p>
      </header>

      <div className="px-4">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-3xl bg-slate-900" />)}
          </div>
        ) : wishlistCourses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {wishlistCourses.map(course => (
              <CourseCard 
                key={course.id} 
                course={course} 
                instructor={instructorsMap.get(course.instructorId) || null}
                variant="catalogue" 
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800/50">
            <div className="p-6 bg-slate-800/50 rounded-full mb-6">
              <Heart className="h-16 w-16 text-slate-700" />
            </div>
            <h3 className="text-xl font-black text-white leading-tight">Votre liste est <br/>vide.</h3>
            <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-[220px] mx-auto font-medium">
              Explorez le catalogue et cliquez sur le coeur pour sauvegarder un cours.
            </p>
            <Button asChild className="mt-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
              <Link href="/search">
                Découvrir des cours
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
