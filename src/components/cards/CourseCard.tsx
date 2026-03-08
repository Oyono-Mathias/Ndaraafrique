'use client';

/**
 * @fileOverview Carte de cours Ndara Afrique.
 * ✅ DESIGN : Images circulaires (aspect-square rounded-full) pour une vue premium.
 */

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Star, Heart, BadgeEuro, Share2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { useLocale } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CourseCardProps {
  course: Course & { progress?: number; lastLessonId?: string };
  instructor: Partial<NdaraUser> | null;
  variant?: 'grid' | 'list' | 'search-result'; 
  actions?: React.ReactNode;
}

export function CourseCard({ course, instructor, variant = 'grid', actions }: CourseCardProps) {
  const { user, currentUser } = useRole();
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

  const progress = course.progress ?? 0;

  useEffect(() => {
    if (!user?.uid || course.id.startsWith('demo')) return;
    const wishlistRef = doc(db, 'users', user.uid, 'wishlist', course.id);
    const unsubWish = onSnapshot(wishlistRef, (snap) => setIsWishlisted(snap.exists()));
    return () => unsubWish();
  }, [user?.uid, course.id, db]);

  const handleSocialShare = (platform: 'whatsapp' | 'facebook' | 'x' | 'linkedin') => {
      const shareUrl = `${window.location.origin}/${locale}/courses/${course.id}?aff=${currentUser?.uid || ''}`;
      const text = `Découvrez cette formation sur Ndara Afrique : ${course.title}`;
      
      let finalUrl = '';
      switch(platform) {
          case 'whatsapp': finalUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`; break;
          case 'facebook': finalUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`; break;
          case 'x': finalUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`; break;
          case 'linkedin': finalUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`; break;
      }
      window.open(finalUrl, '_blank');
  };

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { router.push(`/${locale}/login?tab=register`); return; }
    if (course.id.startsWith('demo')) return;

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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex items-center transition-all duration-300 hover:border-brand-primary/50 hover:shadow-xl active:scale-[0.98] p-3">
            <div className="relative h-20 w-20 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <Image
                src={course.imageUrl || `https://picsum.photos/seed/${course.id}/200/200`}
                alt={course.title}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
            <div className="flex-1 ml-4 flex flex-col justify-center min-w-0">
              <div className="space-y-0.5">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-primary truncate">{course.category}</p>
                <h3 className="font-bold text-sm text-brand-dark dark:text-white line-clamp-1 group-hover:text-brand-primary transition-colors uppercase tracking-tight">{course.title}</h3>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-500"><span>Progression</span> <span>{progress}%</span></div>
                <Progress value={progress} className="h-1" indicatorClassName={cn(progress === 100 ? "bg-green-500" : "bg-brand-primary")} />
              </div>
            </div>
          </div>
        </Link>
        {actions && <div className="absolute top-2 right-2 flex gap-1">{actions}</div>}
      </div>
    );
  }

  const hasRating = course.rating !== undefined && course.rating > 0;

  return (
    <div className="relative group h-full">
      <Link href={href} className="block group h-full">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 dark:border-slate-800 flex flex-col h-full active:scale-[0.98]">
          <div className="p-4 flex justify-center">
            <div className="relative aspect-square w-full max-w-[200px] bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-xl border-4 border-white dark:border-slate-800">
                <Image
                src={course.imageUrl || `https://picsum.photos/seed/${course.id}/400/400`}
                alt={course.title}
                fill
                sizes="(max-width: 768px) 40vw, 200px"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {course.resaleRightsAvailable && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Badge className="bg-amber-500 text-black border-none font-black uppercase text-[7px] tracking-[0.1em] px-2 py-0.5 shadow-lg">
                        LICENCE
                    </Badge>
                </div>
                )}
            </div>
          </div>
          
          <div className="px-6 pb-6 pt-2 flex-1 flex flex-col items-center text-center">
              <span className="text-[9px] font-black text-brand-secondary bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded uppercase tracking-widest mb-3">{course.category || 'Formation'}</span>
              
              <h3 className="text-base font-black text-brand-dark dark:text-white mb-2 leading-tight uppercase tracking-tight group-hover:text-brand-primary transition-colors line-clamp-2 min-h-[2.5rem]">
                  {course.title}
              </h3>
              
              <div className="flex items-center gap-4 mt-auto pt-4 border-t border-slate-50 dark:border-white/5 w-full justify-center">
                  <div className="flex items-center gap-1">
                      <Star className={cn("w-3.5 h-3.5", hasRating ? "text-yellow-400 fill-current" : "text-slate-200 dark:text-slate-700")} />
                      <span className="text-xs font-black text-slate-700 dark:text-slate-400">
                          {hasRating ? course.rating?.toFixed(1) : "Nouveau"}
                      </span>
                  </div>
                  <span className="text-base font-black text-brand-dark dark:text-white">
                      {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'OFFERT'}
                  </span>
              </div>
          </div>

          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                {!course.id.startsWith('demo') && (
                    <button 
                        onClick={toggleWishlist}
                        className={cn(
                        "p-2 rounded-full backdrop-blur-md border border-white/10 transition-all active:scale-90",
                        isWishlisted ? "bg-brand-primary text-white" : "bg-black/40 text-white hover:bg-black/60"
                        )}
                    >
                        <Heart className={cn("h-3.5 w-3.5", isWishlisted && "fill-current")} />
                    </button>
                )}
                
                {currentUser && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-full backdrop-blur-md border border-white/10 bg-black/40 text-white hover:bg-black/60 active:scale-90">
                                <Share2 className="h-3.5 w-3.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-900 border-slate-800 text-white p-2 min-w-[160px] rounded-xl shadow-2xl">
                            <DropdownMenuItem className="py-2.5 cursor-pointer font-bold text-[10px] uppercase" onClick={() => handleSocialShare('whatsapp')}>WhatsApp</DropdownMenuItem>
                            <DropdownMenuItem className="py-2.5 cursor-pointer font-bold text-[10px] uppercase" onClick={() => handleSocialShare('facebook')}>Facebook</DropdownMenuItem>
                            <DropdownMenuItem className="py-2.5 cursor-pointer font-bold text-[10px] uppercase" onClick={() => handleSocialShare('x')}>X</DropdownMenuItem>
                            <DropdownMenuItem className="py-2.5 cursor-pointer font-bold text-[10px] uppercase" onClick={() => handleSocialShare('linkedin')}>LinkedIn</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
      </Link>
    </div>
  );
}
