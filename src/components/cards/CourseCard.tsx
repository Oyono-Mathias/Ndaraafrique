'use client';

/**
 * @fileOverview Carte de cours Ndara Afrique.
 * ✅ AFFILIATION : Bouton de partage rapide avec ID Ambassadeur.
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex items-stretch transition-all duration-300 hover:border-brand-primary/50 hover:shadow-xl active:scale-[0.98]">
            <div className="relative w-28 sm:w-36 shrink-0 bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <Image
                src={course.imageUrl || `https://picsum.photos/seed/${course.id}/300/200`}
                alt={course.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 112px, 144px"
              />
            </div>
            <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-primary truncate">{course.category}</p>
                <h3 className="font-bold text-sm sm:text-base text-brand-dark dark:text-white line-clamp-1 group-hover:text-brand-primary transition-colors uppercase tracking-tight">{course.title}</h3>
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500"><span>Progression</span> <span>{progress}%</span></div>
                <Progress value={progress} className="h-1.5" indicatorClassName={cn(progress === 100 ? "bg-green-500" : "bg-brand-primary")} />
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-800 flex flex-col h-full active:scale-[0.98]">
          <div className="relative aspect-video w-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <Image
              src={course.imageUrl || `https://picsum.photos/seed/${course.id}/600/400`}
              alt={course.title}
              fill
              sizes="(max-width: 768px) 48vw, (max-width: 1200px) 30vw, 25vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            
            {course.resaleRightsAvailable && (
              <div className="absolute top-4 left-4 z-10">
                  <Badge className="bg-amber-500 text-black border-none font-black uppercase text-[8px] tracking-[0.15em] px-2 py-1 flex items-center gap-1 shadow-lg">
                      <BadgeEuro className="h-3 w-3" />
                      Licence
                  </Badge>
              </div>
            )}

            <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                {!course.id.startsWith('demo') && (
                    <button 
                        onClick={toggleWishlist}
                        className={cn(
                        "p-2 rounded-full backdrop-blur-md border border-white/10 transition-all active:scale-90",
                        isWishlisted ? "bg-brand-primary text-white" : "bg-black/40 text-white hover:bg-black/60"
                        )}
                    >
                        <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")} />
                    </button>
                )}
                
                {currentUser && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-full backdrop-blur-md border border-white/10 bg-black/40 text-white hover:bg-black/60 active:scale-90">
                                <Share2 className="h-4 w-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-900 border-slate-800 text-white p-2 min-w-[160px] rounded-xl shadow-2xl">
                            <DropdownMenuItem className="py-2.5 cursor-pointer font-bold text-xs uppercase" onClick={() => handleSocialShare('whatsapp')}>WhatsApp</DropdownMenuItem>
                            <DropdownMenuItem className="py-2.5 cursor-pointer font-bold text-xs uppercase" onClick={() => handleSocialShare('facebook')}>Facebook</DropdownMenuItem>
                            <DropdownMenuItem className="py-2.5 cursor-pointer font-bold text-xs uppercase" onClick={() => handleSocialShare('x')}>X (Twitter)</DropdownMenuItem>
                            <DropdownMenuItem className="py-2.5 cursor-pointer font-bold text-xs uppercase" onClick={() => handleSocialShare('linkedin')}>LinkedIn</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
          </div>
          
          <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black text-brand-secondary bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded uppercase tracking-widest">{course.category || 'Formation'}</span>
              </div>
              
              <h3 className="text-lg font-black text-brand-dark dark:text-white mb-2 leading-tight uppercase tracking-tight group-hover:text-brand-primary transition-colors line-clamp-2">
                  {course.title}
              </h3>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-white/5 mt-auto">
                  <div className="flex items-center gap-1">
                      <Star className={cn("w-4 h-4", hasRating ? "text-yellow-400 fill-current" : "text-slate-200 dark:text-slate-700")} />
                      <span className="text-sm font-black text-slate-700 dark:text-slate-400">
                          {hasRating ? course.rating?.toFixed(1) : "Nouveau"}
                      </span>
                  </div>
                  <span className="text-lg font-black text-brand-dark dark:text-white">
                      {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'OFFERT'}
                  </span>
              </div>
          </div>
        </div>
      </Link>
    </div>
  );
}