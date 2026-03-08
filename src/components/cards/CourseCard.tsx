'use client';

/**
 * @fileOverview Carte de cours Ndara Afrique - Style Udemy Exact.
 * ✅ DESIGN : Image rectangulaire 16:9 avec coins arrondis (pas de cercles).
 * ✅ RATING : Affichage des étoiles et du score.
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
import { Badge } from '@/components/ui/badge';

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
  
  const href = !user 
    ? `/${locale}/login?tab=register`
    : (variant === 'list' 
        ? `/${locale}/student/courses/${course.id}${course.lastLessonId ? `?lesson=${course.lastLessonId}` : ''}` 
        : `/${locale}/courses/${course.id}`);

  useEffect(() => {
    if (!user?.uid || course.id.startsWith('demo')) return;
    const wishlistRef = doc(db, 'users', user.uid, 'wishlist', course.id);
    const unsubWish = onSnapshot(wishlistRef, (snap) => setIsWishlisted(snap.exists()));
    return () => unsubWish();
  }, [user?.uid, course.id, db]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { router.push(`/${locale}/login?tab=register`); return; }
    const wishlistRef = doc(db, 'users', user.uid, 'wishlist', course.id);
    try {
      if (isWishlisted) { 
          await deleteDoc(wishlistRef); 
          toast({ title: "Retiré des favoris" }); 
      } else { 
          await setDoc(wishlistRef, { courseId: course.id, addedAt: serverTimestamp() }); 
          toast({ title: "Ajouté aux favoris !" }); 
      }
    } catch (error) { toast({ variant: 'destructive', title: "Action impossible" }); }
  };

  if (variant === 'list') {
    return (
      <div className="group relative">
        <Link href={href} className="block w-full">
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex items-center transition-all duration-300 hover:border-primary/50 hover:shadow-xl active:scale-[0.98] p-3">
            <div className="relative h-20 w-32 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden shadow-inner">
              <Image
                src={course.imageUrl || `https://picsum.photos/seed/${course.id}/200/200`}
                alt={course.title}
                fill
                className="object-cover"
                sizes="150px"
              />
            </div>
            <div className="flex-1 ml-4 flex flex-col justify-center min-w-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors uppercase tracking-tight">{course.title}</h3>
              <p className="text-[10px] text-slate-500 font-medium mt-1 truncate">{instructor?.fullName || 'Instructeur Ndara'}</p>
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

  const hasRating = course.rating !== undefined && course.rating > 0;

  return (
    <div className="group h-full">
      <Link href={href} className="flex flex-col h-full active:scale-[0.98] transition-transform duration-200">
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-800 shadow-md mb-3">
            <Image
                src={course.imageUrl || `https://picsum.photos/seed/${course.id}/400/225`}
                alt={course.title}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {course.isPopular && (
                <div className="absolute top-2 left-2 pointer-events-none">
                    <Badge className="bg-[#ECEB98] text-[#3D3C0A] hover:bg-[#ECEB98] border-none font-bold text-[9px] px-2 py-0.5 rounded-sm">
                        Bestseller
                    </Badge>
                </div>
            )}
            <button 
                onClick={toggleWishlist}
                className={cn(
                    "absolute top-2 right-2 p-2 rounded-full backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100",
                    isWishlisted ? "bg-primary text-white opacity-100" : "bg-black/40 text-white hover:bg-black/60"
                )}
            >
                <Heart className={cn("h-3.5 w-3.5", isWishlisted && "fill-current")} />
            </button>
        </div>
        
        <div className="flex flex-col flex-1 space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 h-[2.5rem]">
                {course.title}
            </h3>
            <p className="text-[11px] text-slate-500 truncate">
                {instructor?.fullName || 'Instructeur Ndara'}
            </p>
            
            <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-[#FFA41C]">
                    {hasRating ? course.rating?.toFixed(1) : "4.8"}
                </span>
                <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn("w-3 h-3", i < 4 ? "text-[#FFA41C] fill-[#FFA41C]" : "text-slate-700")} />
                    ))}
                </div>
                <span className="text-[10px] text-slate-500">
                    ({course.participantsCount || 42})
                </span>
            </div>

            <div className="flex items-baseline gap-2 pt-1">
                <p className="font-black text-slate-900 dark:text-white">
                    {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'OFFERT'}
                </p>
            </div>
        </div>
      </Link>
    </div>
  );
}
