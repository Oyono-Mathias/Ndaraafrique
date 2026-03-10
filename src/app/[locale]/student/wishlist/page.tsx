'use client';

/**
 * @fileOverview Page Ma Liste de Souhaits (Favoris) Ndara Afrique.
 * ✅ STYLE : Android-First Vintage avec collection racine user_wishlist.
 */

import { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, onSnapshot, query, getDocs, documentId, where } from 'firebase/firestore';
import { CourseCard } from '@/components/cards/CourseCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Course, NdaraUser } from '@/lib/types';

export default function WishlistPage() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const [wishlistCourses, setWishlistCourses] = useState<Course[]>([]);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    setIsLoading(true);
    // On écoute la collection racine filtrée par userId
    const qWish = query(collection(db, 'user_wishlist'), where('userId', '==', currentUser.uid));
    
    const unsubscribe = onSnapshot(qWish, async (snap) => {
      if (snap.empty) {
        setWishlistCourses([]);
        setIsLoading(false);
        return;
      }

      const courseIds = snap.docs.map(doc => doc.data().courseId);
      
      try {
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
      } catch (err) {
          console.error("Fetch wishlist items error:", err);
      } finally {
          setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser?.uid, db]);

  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
      <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-2 text-primary mb-2">
            <Heart className="h-5 w-5 fill-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ma Sélection</span>
        </div>
        <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">Liste de <br/><span className="text-primary">Souhaits</span></h1>
        <p className="text-slate-500 text-sm mt-2 font-medium">Vos futures compétences n'attendent que vous.</p>
      </header>

      <div className="px-4">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-4">
                    <Skeleton className="h-48 w-full rounded-[2rem] bg-slate-900 border border-slate-800" />
                    <Skeleton className="h-4 w-3/4 bg-slate-900" />
                </div>
            ))}
          </div>
        ) : wishlistCourses.length > 0 ? (
          <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-700">
            {wishlistCourses.map(course => (
              <CourseCard 
                key={course.id} 
                course={course} 
                instructor={instructorsMap.get(course.instructorId) || null}
                variant="grid" 
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800 animate-in zoom-in duration-500">
            <div className="p-6 bg-slate-800/50 rounded-full mb-6">
              <Heart className="h-16 w-16 text-slate-700" />
            </div>
            <h3 className="text-xl font-black text-white leading-tight uppercase tracking-tight">Votre liste est vide</h3>
            <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-[220px] mx-auto font-medium">
              Explorez le catalogue et marquez d'un cœur les formations qui vous inspirent.
            </p>
            <Button asChild className="mt-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl h-14 px-10 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
              <Link href="/search">
                Découvrir des cours
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="px-6 py-12">
          <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl flex items-start gap-4">
              <Sparkles className="h-6 w-6 text-primary shrink-0" />
              <div>
                  <p className="text-xs font-black text-white uppercase tracking-widest">Conseil Ndara</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-medium italic">
                      Les cours dans votre liste de souhaits sont analysés par MATHIAS pour vous proposer des recommandations encore plus personnalisées.
                  </p>
              </div>
          </div>
      </div>
    </div>
  );
}