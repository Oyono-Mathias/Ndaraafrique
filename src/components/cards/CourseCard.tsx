'use client';

/**
 * @fileOverview Carte de cours Ndara Afrique Multi-Style.
 * ✅ DESIGN : Look Udemy minimaliste avec bordures fines.
 * ✅ OPTIMISÉ : next/image avec priority géré par variant.
 */

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Star, Heart, ShoppingCart, CheckCircle2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, collection, query, where } from 'firebase/firestore';
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
  const [isInCart, setIsInCart] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [stats, setStats] = useState({ rating: course.rating || 0, count: course.participantsCount || 0 });
  
  const progress = course.progress ?? 0;
  const href = variant === 'list' 
    ? `/${locale}/student/courses/${course.id}${course.lastLessonId ? `?lesson=${course.lastLessonId}` : ''}` 
    : `/${locale}/courses/${course.id}`;

  useEffect(() => {
    if (!user?.uid) return;
    const wishlistRef = doc(db, 'users', user.uid, 'wishlist', course.id);
    const cartRef = doc(db, 'users', user.uid, 'cart', course.id);
    const enrollmentRef = doc(db, 'enrollments', `${user.uid}_${course.id}`);
    const unsubWish = onSnapshot(wishlistRef, (snap) => setIsWishlisted(snap.exists()));
    const unsubCart = onSnapshot(cartRef, (snap) => setIsInCart(snap.exists()));
    const unsubEnroll = onSnapshot(enrollmentRef, (snap) => setIsEnrolled(snap.exists()));
    return () => { unsubWish(); unsubCart(); unsubEnroll(); };
  }, [user?.uid, course.id, db]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { router.push(`/${locale}/login`); return; }
    const wishlistRef = doc(db, 'users', user.uid, 'wishlist', course.id);
    try {
      if (isWishlisted) { await deleteDoc(wishlistRef); toast({ title: "Retiré des favoris" }); }
      else { await setDoc(wishlistRef, { courseId: course.id, addedAt: serverTimestamp() }); toast({ title: "Ajouté aux favoris !" }); }
    } catch (error) { toast({ variant: 'destructive', title: "Action impossible" }); }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { router.push(`/${locale}/login`); return; }
    if (isEnrolled) { router.push(`/${locale}/student/courses/${course.id}`); return; }
    if (isInCart) { router.push(`/${locale}/student/cart`); return; }
    setIsCartLoading(true);
    try {
        const cartRef = doc(db, 'users', user.uid, 'cart', course.id);
        await setDoc(cartRef, { courseId: course.id, title: course.title, price: course.price, imageUrl: course.imageUrl || '', addedAt: serverTimestamp() });
        toast({ title: "Cours ajouté au panier !" });
    } catch (err) { toast({ variant: 'destructive', title: "Erreur panier" }); }
    finally { setIsCartLoading(false); }
  };

  if (variant === 'list') {
    return (
      <div className="group relative">
        <Link href={href} className="block w-full">
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden flex items-stretch transition-all duration-300 hover:border-primary/50 hover:shadow-xl active:scale-[0.98]">
            <div className="relative w-28 sm:w-36 shrink-0 bg-muted overflow-hidden">
              <Image
                src={course.imageUrl || `https://picsum.photos/seed/${course.id}/300/200`}
                alt={course.title}
                width={144}
                height={96}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary truncate">{course.category}</p>
                <h3 className="font-bold text-sm sm:text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors uppercase tracking-tight">{course.title}</h3>
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground"><span>Progression</span> <span>{progress}%</span></div>
                <Progress value={progress} className="h-1.5" indicatorClassName={cn(progress === 100 ? "bg-green-500" : "bg-primary")} />
              </div>
            </div>
          </div>
        </Link>
        {actions && <div className="absolute top-2 right-2 flex gap-1">{actions}</div>}
      </div>
    );
  }

  return (
    <Link href={href} className="block group h-full">
      <div className="flex flex-col h-full bg-transparent transition-all duration-300 active:scale-[0.98]">
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/5 shadow-sm mb-3 bg-slate-800">
          <Image
            src={course.imageUrl || `https://picsum.photos/seed/${course.id}/600/400`}
            alt={course.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <button 
            onClick={toggleWishlist}
            className={cn(
              "absolute top-2 right-2 p-2 rounded-full backdrop-blur-md border border-white/10 transition-all active:scale-90 z-10",
              isWishlisted ? "bg-primary text-white" : "bg-black/40 text-white hover:bg-black/60"
            )}
          >
            <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")} />
          </button>
        </div>
        <div className="flex-1 flex flex-col gap-1 px-1">
          <h3 className="font-black text-[14px] leading-snug text-foreground line-clamp-2 uppercase tracking-tight group-hover:text-primary transition-colors">{course.title}</h3>
          <p className="text-[11px] text-muted-foreground font-medium truncate">{instructor?.fullName || 'Expert Ndara'}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[12px] font-black text-[#CC7722]">{stats.rating > 0 ? stats.rating.toFixed(1).replace('.', ',') : "Nouveau"}</span>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={cn("h-3 w-3", i < Math.floor(stats.rating || 0) ? "fill-[#CC7722] text-[#CC7722]" : "text-slate-700")} />
              ))}
            </div>
            {stats.count > 0 && <span className="text-[10px] text-muted-foreground font-bold">({stats.count})</span>}
          </div>
          <p className="font-black text-[15px] text-foreground mt-1">{course.price > 0 ? `${course.price.toLocaleString('fr-FR')} FCFA` : 'OFFERT'}</p>
        </div>
      </div>
    </Link>
  );
}
