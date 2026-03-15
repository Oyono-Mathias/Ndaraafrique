'use client';

/**
 * @fileOverview Carte de cours Ndara Afrique.
 * ✅ VARIANTS : Grid, List, Search-Result, Instructor.
 * ✅ ACTIONS : Raccordement au hook usePurchase pour l'achat immédiat.
 */

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { 
    Star, 
    Heart, 
    Users, 
    Clock, 
    CheckCircle2, 
    Image as ImageIcon,
    Pencil,
    FileText,
    Trash2,
    ShoppingCart,
    Play
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { useLocale } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePurchase } from '@/hooks/use-purchase';

interface CourseCardProps {
  course: Course & { progress?: number; lastLessonId?: string };
  instructor: Partial<NdaraUser> | null;
  variant?: 'grid' | 'list' | 'search-result' | 'instructor'; 
  actions?: React.ReactNode;
}

export function CourseCard({ course, instructor, variant = 'grid', actions }: CourseCardProps) {
  const { user } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const locale = useLocale();
  const { initiatePurchase } = usePurchase();
  
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  
  const href = `/${locale}/course/${course.id}`;

  useEffect(() => {
    if (!user?.uid || !course.id) return;
    
    // Check Wishlist
    const wishId = `${user.uid}_${course.id}`;
    const unsubWish = onSnapshot(doc(db, 'user_wishlist', wishId), (snap) => {
        setIsWishlisted(snap.exists());
    });

    // Check Enrollment
    const unsubEnroll = onSnapshot(doc(db, 'enrollments', `${user.uid}_${course.id}`), (snap) => {
        setIsEnrolled(snap.exists());
    });

    return () => {
        unsubWish();
        unsubEnroll();
    };
  }, [user?.uid, course.id, db]);

  const handleEnrollClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      initiatePurchase(course);
  };

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

  if (variant === 'instructor') {
    const isPublished = course.status === 'Published';
    const isPending = course.status === 'Pending Review';
    
    return (
        <div className="bg-[#1e293b] rounded-[2rem] p-4 border border-white/5 flex flex-col gap-4 shadow-xl active:scale-[0.98] transition-all group">
            <div className="w-full aspect-video rounded-[1.5rem] overflow-hidden relative bg-slate-800 shadow-inner">
                {course.imageUrl ? (
                    <Image src={course.imageUrl} alt={course.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-700">
                        <ImageIcon size={48} className="opacity-20" />
                    </div>
                )}
                <div className="absolute top-3 right-3">
                    <Badge className={cn(
                        "font-black text-[9px] uppercase border-none px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-md",
                        isPublished ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30" : 
                        isPending ? "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30" : 
                        "bg-slate-800/80 text-slate-400 border border-slate-700"
                    )}>
                        {isPublished ? <CheckCircle2 size={10} /> : isPending ? <Clock size={10} /> : <FileText size={10} />}
                        {isPublished ? 'Publié' : isPending ? 'En Examen' : 'Brouillon'}
                    </Badge>
                </div>
            </div>

            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">{course.category}</span>
                    <span className="text-slate-700 text-[10px]">•</span>
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-tighter">Formation Expert</span>
                </div>
                <h3 className="font-black text-white text-base leading-tight mb-4 line-clamp-2 uppercase tracking-tight">{course.title}</h3>
                
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-600" />
                        <span className="text-slate-400 text-xs font-black uppercase">{(course.participantsCount || 0).toLocaleString()} élèves</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                        <span className="text-white text-xs font-black">{course.rating ? course.rating.toFixed(1) : '---'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                    <Button asChild className="flex-1 h-12 rounded-2xl bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981] hover:text-slate-950 font-black uppercase text-[10px] tracking-widest transition-all border-none active:scale-95 shadow-lg">
                        <Link href={`/${locale}/instructor/courses/edit/${course.id}`}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> Éditer
                        </Link>
                    </Button>
                    {actions}
                </div>
            </div>
        </div>
    );
  }

  if (variant === 'search-result') {
    return (
        <Link href={href} className="course-card block active:scale-[0.98] transition-all">
            <div className="bg-[#1e293b] rounded-[2rem] p-3 border border-white/5 flex gap-4 shadow-xl">
                <div className="w-32 h-20 rounded-[1.5rem] overflow-hidden flex-shrink-0 relative shadow-inner bg-slate-800">
                    <Image src={course.imageUrl || ''} alt={course.title} fill className="object-cover" />
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
                                <span className="text-white text-[10px] font-black">{course.rating ? course.rating.toFixed(1) : '---'}</span>
                            </div>
                        </div>
                        <span className="text-[#10b981] text-[13px] font-black uppercase">
                            {course.price === 0 ? 'Offert' : `${(course.price / 1000).toFixed(0)}K XOF`}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
  }

  if (variant === 'list') {
    const isCompleted = course.progress === 100;
    
    return (
      <div className="group relative">
        <Link href={href} className="block w-full active:scale-[0.98] transition-transform">
          <div className="bg-[#1e293b] border border-white/5 rounded-[2rem] overflow-hidden flex items-center p-4 shadow-xl relative group">
            <div className="relative h-20 w-20 shrink-0 rounded-3xl overflow-hidden bg-slate-800 shadow-inner">
              <Image src={course.imageUrl || ''} alt={course.title} fill className="object-cover" />
              {isCompleted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="w-10 h-10 bg-[#10b981] rounded-full flex items-center justify-center shadow-lg">
                          <CheckCircle2 className="h-5 w-5 text-[#0f172a]" />
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
                          <span className="text-[#10b981] text-[10px] font-black">
                              {isCompleted ? 'TERMINÉ' : `${course.progress}%`}
                          </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className="h-full bg-[#10b981] transition-all duration-1000 shadow-[0_0_10px_#10b981]" 
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

  // --- GRID VARIANT (Standard Landing Page) ---
  return (
    <div className="group h-full flex flex-col">
      <Link href={href} className="flex flex-col flex-1 active:scale-[0.98] transition-transform">
        <div className="relative aspect-video w-full rounded-[2rem] overflow-hidden bg-slate-800 shadow-2xl mb-3 border border-white/5">
            <Image src={course.imageUrl || ''} alt={course.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
            
            <button 
                onClick={toggleWishlist} 
                className={cn(
                    "absolute top-3 right-3 p-2 rounded-full backdrop-blur-md border border-white/10 transition-all z-20", 
                    isWishlisted ? "bg-[#10b981] text-white scale-110 shadow-glow" : "bg-black/40 text-white opacity-0 group-hover:opacity-100"
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
            
            <div className="flex items-center justify-between mt-3 mb-4">
                <div className="flex items-center gap-1.5">
                    <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                    <span className="text-[10px] font-black text-slate-300">{course.rating ? course.rating.toFixed(1) : '---'}</span>
                </div>
                <p className="text-sm font-black text-[#10b981] uppercase tracking-tighter">
                    {course.price === 0 ? "Offert" : `${course.price.toLocaleString('fr-FR')} F`}
                </p>
            </div>
        </div>
      </Link>

      <Button 
        onClick={handleEnrollClick}
        className={cn(
            "w-full h-11 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all shadow-lg active:scale-95 border-none",
            isEnrolled 
                ? "bg-slate-800 text-primary hover:bg-slate-700" 
                : "bg-primary text-slate-950 hover:bg-primary/90"
        )}
      >
        {isEnrolled ? (
            <><Play className="h-3 w-3 mr-2 fill-current" /> Reprendre</>
        ) : (
            <><ShoppingCart className="h-3 w-3 mr-2" /> S'inscrire</>
        )}
      </Button>
    </div>
  );
}
