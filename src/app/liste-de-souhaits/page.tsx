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
import { Heart, Trash2, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Course, Enrollment } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { cn } from '@/lib/utils';

interface WishlistItem {
  id: string;
  courseId: string;
}

interface WishlistCourse extends Course {
  wishlistItemId: string;
  instructorName?: string;
  isEnrolled: boolean;
}

const WishlistCard = ({ course, onRemove }: { course: WishlistCourse, onRemove: (wishlistItemId: string) => void }) => {
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(course.wishlistItemId);
  }

  return (
    <div className="relative group bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50">
      <Link href={course.isEnrolled ? `/courses/${course.id}` : `/course/${course.id}`} className="flex gap-4">
        <Image
          src={course.imageUrl || `https://picsum.photos/seed/${course.id}/150/100`}
          alt={course.title}
          width={120}
          height={80}
          className="aspect-video object-cover shrink-0"
        />
        <div className="py-3 pr-4 flex flex-col justify-center flex-1 overflow-hidden">
          <div>
            <h3 className="font-bold text-sm text-white line-clamp-2">{course.title}</h3>
            <p className="text-xs text-slate-400 truncate">Par {course.instructorName || 'un instructeur'}</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="font-bold text-base text-primary">
              {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'Gratuit'}
            </p>
          </div>
        </div>
      </Link>
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-2 right-2 h-8 w-8 text-slate-400 opacity-50 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
        onClick={handleRemoveClick}
        aria-label="Retirer de la liste de souhaits"
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
      if (!isUserLoading) setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(query(collection(db, `users/${user.uid}/wishlist`)), async (snapshot) => {
      setIsLoading(true);
      if (snapshot.empty) {
        setWishlistCourses([]);
        setIsLoading(false);
        return;
      }
      
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WishlistItem));
      const courseIds = items.map(i => i.courseId).filter(Boolean);
      
      if (courseIds.length === 0) {
        setWishlistCourses([]);
        setIsLoading(false);
        return;
      }

      // Fetch user's enrollments to check status
      const enrollmentsQuery = query(collection(db, 'enrollments'), where('studentId', '==', user.uid));
      const enrollmentsSnap = await getDocs(enrollmentsQuery);
      const enrolledCourseIds = new Set(enrollmentsSnap.docs.map(doc => doc.data().courseId));

      const coursesSnap = await getDocs(query(collection(db, 'courses'), where('__name__', 'in', courseIds.slice(0, 30))));
      const coursesMap = new Map(coursesSnap.docs.map(d => [d.id, { id: d.id, ...d.data() } as Course]));
      
      const instructorIds = [...new Set(coursesSnap.docs.map(d => d.data().instructorId).filter(Boolean))];
      const instMap = new Map<string, FormaAfriqueUser>();
      
      if (instructorIds.length > 0) {
        const instSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', instructorIds.slice(0, 30))));
        instSnap.forEach(d => instMap.set(d.data().uid, d.data() as FormaAfriqueUser));
      }

      const result: WishlistCourse[] = [];
      items.forEach(item => {
        const course = coursesMap.get(item.courseId);
        if (course) {
          const instructor = instMap.get(course.instructorId);
          result.push({
            ...course,
            wishlistItemId: item.id,
            instructorName: instructor?.fullName,
            id: course.id,
            isEnrolled: enrolledCourseIds.has(course.id),
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
      toast({ title: 'Retiré', description: 'Le cours a été retiré de votre liste de souhaits.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de retirer le cours de la liste.' });
    }
  };
  
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <Heart className="h-7 w-7 text-primary"/>
        <h1 className="text-3xl font-bold text-white">Ma liste de souhaits</h1>
      </header>
      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-[100px] w-full bg-slate-800" />)}
        </div>
      ) : wishlistCourses.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl border-slate-700">
          <Heart className="mx-auto h-12 w-12 text-red-400/50" />
          <h3 className="mt-4 text-lg font-semibold text-slate-300">Votre liste est vide</h3>
          <p className="text-sm text-slate-400">Ajoutez des cours qui vous intéressent pour les retrouver plus tard.</p>
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
