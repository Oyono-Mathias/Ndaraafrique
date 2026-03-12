
'use client';

/**
 * @fileOverview Carte de cours Ndara Afrique.
 * ✅ VARIANTS : Grid, List, Search-Result.
 * ✅ DESIGN : Android-first avec coins arrondis 2rem.
 * ✅ UPDATE : Progress bar style Qwen avec effet glow.
 */

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Star, Heart, Users, Clock, CheckCircle2 } from 'lucide-react';
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
        toast({ variant: 'destructive', title: "Erreur favoris" }); 
    }
  };

  // --- VARIANT: SEARCH RESULT (HORIZONTAL) ---
  if (variant === 'search-result') {
    return (
        <Link href={href} className="course-card block active:scale-[0.98] transition-all">
            <div className="bg-ndara-surface rounded-[2rem] p-3 border border-white/5 flex gap-4 shadow-xl">
                <div className="w-32 h-20 rounded-[1.5rem] overflow-hidden flex-shrink-0 relative shadow-inner bg-slate-800">
                    <Image src={course.imageUrl || ''} alt={course.title} fill className="object-cover" />
                    <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-tighter">
                        15h
                    </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                        <h3 className="font-black text-white text-[13px] leading-tight line-clamp-2 uppercase tracking-tight">
                            {course.title}
                        </h3>
                        <p className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-widest truncate">
                            Par {instructor?.fullName || 'Expert Ndara'}
                        </p>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center text-yellow-500 gap-1">
                                <Star className="h-2.5 w-2.5 fill-current" />
                                <span className="text-white text-[10px] font-black">{course.rating?.toFixed(1) || '4.8'}</span>
                            </div>
                            <div className="flex items-center text-slate-600 gap-1">
                                <Users className="h-2.5 w-2.5" />
                                <span className="text-[9px] font-bold">{(course.participantsCount || 450).toLocaleString()}</span>
                            </div>
                        </div>
                        <span className="text-primary text-[13px] font-black uppercase">
                            {course.price === 0 ? 'Offert' : `${(course.price / 1000).toFixed(0)}K XOF`}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
  }

  // --- VARIANT: LIST (DRAWER / STUDENT DASHBOARD) ---
  if (variant === 'list') {
    const isCompleted = course.progress === 100;
    
    return (
      <div className="group relative">
        <Link href={href} className="block w-full active:scale-[0.98] transition-transform">
          <div className="bg-ndara-surface border border-white/5 rounded-[2rem] overflow-hidden flex items-center p-4 shadow-xl relative group">
            {/* Thumbnail 1:1 Qwen Style */}
            <div className="relative h-20 w-20 shrink-0 rounded-3xl overflow-hidden bg-slate-800 shadow-inner">
              <Image src={course.imageUrl || ''} alt={course.title} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/20" />
              {isCompleted && (
                  <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg">
                          <CheckCircle2 className="h-5 w-5 text-ndara-bg" />
                      </div>
                  </div>
              )}
            </div>

            <div className="flex-1 ml-4 overflow-hidden flex flex-col justify-between py-1">
              <div>
                <h3 className="font-black text-sm text-white leading-tight line-clamp-2 uppercase tracking-tight">{course.title}</h3>
                <p className="text-[10px] text-slate-500 mt-1 truncate uppercase font-bold tracking-widest">Par {instructor?.fullName || 'Expert Ndara'}</p>
              </div>

              {course.progress !== undefined && (
                  <div className="mt-3">
                      <div className="flex items-center justify-between mb-1.5">
                          <span className="text-slate-600 text-[9px] font-black uppercase tracking-tighter">
                              {isCompleted ? 'STATUT' : 'PROGRESSION'}
                          </span>
                          <span className="text-primary text-[10px] font-black">
                              {isCompleted ? 'TERMINÉ' : `${course.progress}%`}
                          </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_hsl(var(--primary))]" 
                            style={{ width: `${course.progress}%` }} 
                          />
                      </div>
                  </div>
              )}
            </div>
          </div>
        </Link>
        {actions && <div className="absolute top-4 right-4 flex gap-1">{actions}</div>}
      </div>
    );
  }

  // --- VARIANT: GRID (DEFAULT) ---
  return (
    <div className="group h-full">
      <Link href={href} className="flex flex-col h-full active:scale-[0.98] transition-transform">
        <div className="relative aspect-video w-full rounded-[2rem] overflow-hidden bg-slate-800 shadow-2xl mb-3 border border-white/5">
            <Image src={course.imageUrl || ''} alt={course.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
            <button 
                onClick={toggleWishlist} 
                className={cn(
                    "absolute top-3 right-3 p-2 rounded-full backdrop-blur-md border border-white/10 transition-all z-20", 
                    isWishlisted ? "bg-primary text-white scale-110 shadow-glow" : "bg-black/40 text-white opacity-0 group-hover:opacity-100"
                )}
            >
                <Heart className={cn("h-3.5 w-3.5", isWishlisted && "fill-current")} />
            </button>
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black text-white border border-white/10 uppercase tracking-tighter">
                {course.category}
            </div>
        </div>
        <div className="flex flex-col flex-1 space-y-1 px-1">
            <h3 className="text-[13px] font-black text-white leading-tight line-clamp-2 h-[2rem] uppercase tracking-tight">{course.title}</h3>
            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5">
                    <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                    <span className="text-[10px] font-black text-slate-300">{course.rating?.toFixed(1) || '4.8'}</span>
                </div>
                <p className="text-sm font-black text-primary uppercase">
                    {course.price === 0 ? "Offert" : `${(course.price / 1000).toFixed(0)}K XOF`}
                </p>
            </div>
        </div>
      </Link>
    </div>
  );
}
