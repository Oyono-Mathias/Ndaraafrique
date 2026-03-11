'use client';

/**
 * @fileOverview Carte de cours Ndara Afrique.
 * ✅ RÉSOLU : Redirection systématique vers la page de détails (/course/ID) pour un parcours propre.
 */

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Star, Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { useLocale } from 'next-intl';
import { useToast } from '@/hooks/use-toast';

interface CourseCardProps {
  course: Course & { progress?: number; lastLessonId?: string };
  instructor: Partial<NdaraUser> | null;
  variant?: 'grid' | 'list' | 'search-result'; 
  actions?: React.ReactNode;
}

export function CourseCard({ course, instructor, variant = 'grid', actions }: CourseCardProps) {
  const { user } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const locale = useLocale();
  
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  // ✅ LOGIQUE DE NAVIGATION : On passe toujours par la page de détails publique
  // La page de détails s'occupera de rediriger vers le lecteur si l'utilisateur est déjà inscrit.
  const href = `/${locale}/course/${course.id}`;

  useEffect(() => {
    if (!user?.uid || !course.id) return;
    const wishId = `${user.uid}_${course.id}`;
    const wishlistRef = doc(db, 'user_wishlist', wishId);
    
    const unsubWish = onSnapshot(wishlistRef, (snap) => {
        setIsWishlisted(snap.exists());
    });
    return () => unsubWish();
  }, [user?.uid, course.id, db]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) { 
        router.push(`/${locale}/login?tab=register`); 
        return; 
    }

    const wishId = `${user.uid}_${course.id}`;
    const wishlistRef = doc(db, 'user_wishlist', wishId);

    try {
      if (isWishlisted) { 
          await deleteDoc(wishlistRef); 
          toast({ title: "Retiré des favoris" }); 
      } else { 
          await setDoc(wishlistRef, { 
              userId: user.uid,
              courseId: course.id, 
              createdAt: serverTimestamp() 
          }); 
          toast({ title: "Ajouté aux favoris !" }); 
      }
    } catch (error) { 
        console.error("Wishlist Error:", error);
        toast({ variant: 'destructive', title: "Erreur", description: "Impossible de modifier vos favoris." }); 
    }
  };

  if (variant === 'list') {
    return (
      <div className="group relative">
        <Link href={href} className="block w-full">
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex items-center p-3 hover:border-primary/50 transition-all">
            <div className="relative h-20 w-32 shrink-0 rounded-lg overflow-hidden bg-slate-800">
              <Image src={course.imageUrl || ''} alt={course.title} fill className="object-cover" />
            </div>
            <div className="flex-1 ml-4 overflow-hidden">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate uppercase">{course.title}</h3>
              <p className="text-[10px] text-slate-500 mt-1 truncate">{instructor?.fullName || 'Expert Ndara'}</p>
              {course.progress !== undefined && (
                  <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${course.progress}%` }} />
                      </div>
                      <span className="text-[9px] font-black text-slate-500">{course.progress}%</span>
                  </div>
              )}
            </div>
          </div>
        </Link>
        {actions && <div className="absolute top-2 right-2 flex gap-1">{actions}</div>}
      </div>
    );
  }

  return (
    <div className="group h-full">
      <Link href={href} className="flex flex-col h-full active:scale-[0.98] transition-transform">
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-800 shadow-md mb-3">
            <Image src={course.imageUrl || ''} alt={course.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
            <button 
                onClick={toggleWishlist} 
                className={cn(
                    "absolute top-2 right-2 p-2 rounded-full backdrop-blur-md border border-white/10 transition-all z-20", 
                    isWishlisted ? "bg-primary text-white scale-110" : "bg-black/40 text-white opacity-0 group-hover:opacity-100"
                )}
            >
                <Heart className={cn("h-3.5 w-3.5", isWishlisted && "fill-current")} />
            </button>
        </div>
        <div className="flex flex-col flex-1 space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 h-[2.5rem] uppercase">{course.title}</h3>
            <p className="text-[11px] text-slate-500 truncate">{instructor?.fullName || 'Expert Ndara'}</p>
            <p className="font-black text-slate-900 dark:text-white mt-1">{course.price === 0 ? "OFFERT" : `${course.price.toLocaleString('fr-FR')} XOF`}</p>
        </div>
      </Link>
    </div>
  );
}
