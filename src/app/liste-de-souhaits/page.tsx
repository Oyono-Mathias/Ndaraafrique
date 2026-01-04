'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRole } from '@/context/RoleContext';
import { 
  getFirestore, 
  collection, 
  query, 
  onSnapshot,
  doc,
  deleteDoc,
  getDocs,
  where
} from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Course } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';

interface WishlistItem {
  id: string;
  courseId: string;
}

interface WishlistCourse extends Course {
  wishlistItemId: string;
  instructorName?: string;
}

const WishlistCard = ({ course, onRemove }: { course: WishlistCourse, onRemove: (wishlistItemId: string) => void }) => {
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(course.wishlistItemId);
  }

  return (
    <div className="relative group bg-white border border-slate-200 rounded-lg overflow-hidden transition-shadow hover:shadow-md">
      <Link href={`/course/${course.id}`} className="flex gap-4">
        <Image
          src={course.imageUrl || `https://picsum.photos/seed/${course.id}/150/100`}
          alt={course.title}
          width={150}
          height={100}
          className="aspect-[3/2] object-cover shrink-0"
        />
        <div className="py-3 pr-4 flex flex-col justify-between flex-1">
          <div>
            <h3 className="font-bold text-sm text-slate-800 line-clamp-2">{course.title}</h3>
            <p className="text-xs text-slate-500 truncate">Par {course.instructorName || 'un instructeur'}</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="font-bold text-base text-slate-900">
              {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} FCFA` : 'Gratuit'}
            </p>
            <Button size="sm" className="h-8">
              S'inscrire
            </Button>
          </div>
        </div>
      </Link>
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-2 right-2 h-7 w-7 text-slate-400 hover:bg-red-100 hover:text-red-600"
        onClick={handleRemoveClick}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function WishlistPage() {
  const { user, isUserLoading } = useRole();
  const db = getFirestore();
  const { toast } = useToast();

  const [wishlistCourses, setWishlistCourses] = useState<WishlistCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading || !user?.uid) {
      setIsLoading(isUserLoading);
      return;
    }

    const unsubscribe = onSnapshot(query(collection(db, `users/${user.uid}/wishlist`)), async (snapshot) => {
      if (snapshot.empty) {
        setWishlistCourses([]);
        setIsLoading(false);
        return;
      }
      
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WishlistItem));
      const ids = items.map(i => i.courseId).filter(Boolean);
      
      if (ids.length === 0) {
        setWishlistCourses([]);
        setIsLoading(false);
        return;
      }

      const coursesSnap = await getDocs(query(collection(db, 'courses'), where('__name__', 'in', ids.slice(0, 30))));
      const coursesMap = new Map(coursesSnap.docs.map(d => [d.id, { id: d.id, ...d.data() } as Course]));
      
      const instructorIds = [...new Set(coursesSnap.docs.map(d => d.data().instructorId).filter(Boolean))];
      const instMap = new Map<string, FormaAfriqueUser>();
      
      if (instructorIds.length > 0) {
        const instSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', instructorIds.slice(0, 30))));
        instSnap.forEach(d => instMap.set(d.data().uid, d.data() as FormaAfriqueUser));
      }

      // VERSION SECURISEE : On utilise une boucle forEach au lieu de map/filter
      const result: WishlistCourse[] = [];
      items.forEach(item => {
        const course = coursesMap.get(item.courseId);
        if (course) {
          const instructor = instMap.get(course.instructorId);
          result.push({
            ...course,
            wishlistItemId: item.id,
            instructorName: instructor?.fullName,
            id: course.id
          });
        }
      });

      setWishlistCourses(result);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, isUserLoading, db]);

  const handleRemoveFromWishlist = async (id: string) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/wishlist`, id));
      toast({ title: 'Retiré', description: 'Cours retiré de la liste.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Action impossible.' });
    }
  };
  
  return (
    <div className="space-y-6">
      <header><h1 className="text-3xl font-bold text-slate-900">Ma liste de souhaits</h1></header>
      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-[100px] w-full bg-slate-200" />)}
        </div>
      ) : wishlistCourses.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <Heart className="mx-auto h-12 w-12 text-red-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-600">Rien ici ❤️</h3>
          <Button asChild variant="link"><Link href="/dashboard">Parcourir les cours</Link></Button>
        </div>
      ) : (
        <div className="space-y-4">
          {wishlistCourses.map(c => <WishlistCard key={c.wishlistItemId} course={c} onRemove={handleRemoveFromWishlist} />)}
        </div>
      )}
    </div>
  );
}