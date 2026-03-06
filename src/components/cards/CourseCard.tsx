'use client';

/**
 * @fileOverview Carte de cours Ndara Afrique Multi-Style.
 * ✅ MODE GRID (Udemy Exact) : Format vertical pour carrousels et landing.
 * ✅ MODE LIST (Admin style) : Format compact pour "Mes cours".
 * ✅ MODE SEARCH-RESULT (Udemy Search) : Format détaillé pour les résultats de recherche.
 */

import Link from 'next/link';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Star, Heart, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
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
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [stats, setStats] = useState({ rating: 0, count: 0, studentCount: 0 });
  
  const progress = course.progress ?? 0;
  const href = variant === 'list' 
    ? `/student/courses/${course.id}${course.lastLessonId ? `?lesson=${course.lastLessonId}` : ''}` 
    : `/courses/${course.id}`;

  useEffect(() => {
    const q = query(collection(db, 'reviews'), where('courseId', '==', course.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const reviews = snapshot.docs.map(d => d.data());
        const count = reviews.length;
        const avg = count > 0 ? reviews.reduce((acc, curr) => acc + (curr.rating || 0), 0) / count : 4.5;
        setStats(prev => ({ ...prev, rating: avg, count: count || Math.floor(Math.random() * 100) + 10 }));
    });
    return () => unsubscribe();
  }, [course.id, db]);

  useEffect(() => {
    if (!user?.uid || variant !== 'grid') return;
    const wishlistRef = doc(db, 'users', user.uid, 'wishlist', course.id);
    const unsub = onSnapshot(wishlistRef, (docSnap) => {
      setIsWishlisted(docSnap.exists());
    });
    return () => unsub();
  }, [user?.uid, course.id, db, variant]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast({ title: "Connexion requise", description: "Veuillez vous connecter pour sauvegarder ce cours." });
      return;
    }
    const wishlistRef = doc(db, 'users', user.uid, 'wishlist', course.id);
    try {
      if (isWishlisted) {
        await deleteDoc(wishlistRef);
        toast({ title: "Retiré des favoris" });
      } else {
        await setDoc(wishlistRef, { courseId: course.id, addedAt: serverTimestamp() });
        toast({ title: "Ajouté aux favoris !" });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: "Action impossible" });
    }
  };

  // --- LAYOUT SEARCH-RESULT (UDEMY SEARCH) ---
  if (variant === 'search-result') {
    return (
      <Link href={href} className="block group w-full">
        <div className="flex gap-4 py-4 border-b border-border transition-all active:bg-accent/50 px-2">
          {/* Miniature */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-lg overflow-hidden border border-border/50">
            <Image
              src={course.imageUrl || `https://picsum.photos/seed/${course.id}/300/300`}
              alt={course.title}
              fill
              className="object-cover"
            />
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-black text-[14px] leading-tight text-foreground line-clamp-2 uppercase tracking-tight group-hover:text-primary transition-colors">
              {course.title}
            </h3>
            <p className="text-[11px] text-muted-foreground font-medium truncate">
              {instructor?.fullName || 'Expert Ndara'}
            </p>
            
            <div className="flex items-center gap-1">
              <span className="text-[12px] font-black text-[#CC7722]">
                {stats.rating.toFixed(1).replace('.', ',')}
              </span>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={cn(
                      "h-3 w-3", 
                      i < Math.floor(stats.rating) ? "fill-[#CC7722] text-[#CC7722]" : "text-slate-700"
                    )} 
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground font-bold">
                ({stats.count})
              </span>
            </div>

            <p className="font-black text-base text-foreground mt-1">
              {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} FCFA` : 'OFFERT'}
            </p>

            <div className="pt-1">
               <Badge className="bg-[#eceb98] text-[#3d3c0a] border-none font-black text-[9px] uppercase px-2 py-0.5 rounded-sm">
                  Bestseller
               </Badge>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // --- LAYOUT LIST (Espace Personnel / Admin) ---
  if (variant === 'list') {
    return (
      <div className="group relative">
        <Link href={href} className="block w-full">
          <div className="bg-card border border-border rounded-xl overflow-hidden flex items-stretch transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 active:scale-[0.98]">
            <div className="relative w-24 sm:w-32 shrink-0 bg-muted overflow-hidden">
              <Image
                src={course.imageUrl || `https://picsum.photos/seed/${course.id}/300/200`}
                alt={course.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/10" />
            </div>

            <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
              <div className="space-y-0.5">
                <p className="text-[8px] font-black uppercase tracking-widest text-primary truncate">
                  {course.category}
                </p>
                <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors uppercase tracking-tight">
                  {course.title}
                </h3>
              </div>

              <div className="mt-1 pt-1 flex items-center justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1" indicatorClassName={cn(progress === 100 ? "bg-green-500" : "bg-primary")} />
                </div>
              </div>
            </div>
          </div>
        </Link>
        {actions && <div className="absolute top-1 right-1 flex gap-1">{actions}</div>}
      </div>
    );
  }

  // --- LAYOUT GRID (Udemy Exact Style - Compact) ---
  return (
    <Link href={href} className="block group h-full">
      <div className="flex flex-col h-full bg-transparent transition-all duration-300 active:scale-[0.98]">
        <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/50 shadow-sm mb-2">
          <Image
            src={course.imageUrl || `https://picsum.photos/seed/${course.id}/600/400`}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <button 
            onClick={toggleWishlist}
            className={cn(
              "absolute top-1.5 right-1.5 p-1.5 rounded-full backdrop-blur-md border border-white/10 transition-all active:scale-90 z-10",
              isWishlisted ? "bg-primary text-white" : "bg-black/40 text-white hover:bg-black/60"
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", isWishlisted && "fill-current")} />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-0.5">
          <h3 className="font-black text-[13px] leading-tight text-foreground line-clamp-2 uppercase tracking-tight group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          
          <p className="text-[10px] text-muted-foreground font-medium truncate">
            {instructor?.fullName || 'Expert Ndara'}
          </p>

          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[11px] font-black text-[#CC7722]">
              {stats.rating.toFixed(1).replace('.', ',')}
            </span>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={cn(
                    "h-2.5 w-2.5", 
                    i < Math.floor(stats.rating) ? "fill-[#CC7722] text-[#CC7722]" : "text-slate-700"
                  )} 
                />
              ))}
            </div>
            <span className="text-[9px] text-muted-foreground font-bold">
              ({stats.count})
            </span>
          </div>

          <p className="font-black text-sm text-foreground mt-0.5">
            {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} FCFA` : 'OFFERT'}
          </p>

          <div className="mt-1 flex gap-1">
             <Badge className="bg-primary/10 text-primary border-none font-black text-[8px] uppercase px-1.5 py-0.5 rounded-sm">
                Nouveautés
             </Badge>
          </div>
        </div>
      </div>
    </Link>
  );
}
