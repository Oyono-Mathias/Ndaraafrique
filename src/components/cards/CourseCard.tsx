'use client';

/**
 * @fileOverview Carte de cours Ndara Afrique Multi-Style.
 * ✅ MODE GRID (Udemy Exact) : Pour le catalogue, la recherche et la landing page.
 * ✅ MODE LIST (Admin style) : Pour les sections "Mes Cours" (Étudiant & Formateur).
 */

import Link from 'next/link';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Star, Heart, BookOpen, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';

interface CourseCardProps {
  course: Course & { progress?: number; lastLessonId?: string };
  instructor: Partial<NdaraUser> | null;
  variant?: 'grid' | 'list'; 
  actions?: React.ReactNode;
}

export function CourseCard({ course, instructor, variant = 'grid', actions }: CourseCardProps) {
  const { user } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [stats, setStats] = useState({ rating: 0, count: 0, studentCount: 0 });
  
  const progress = course.progress ?? 0;
  const isListView = variant === 'list';
  const href = isListView ? `/student/courses/${course.id}${course.lastLessonId ? `?lesson=${course.lastLessonId}` : ''}` : `/courses/${course.id}`;

  useEffect(() => {
    const q = query(collection(db, 'reviews'), where('courseId', '==', course.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const reviews = snapshot.docs.map(d => d.data());
        const count = reviews.length;
        const avg = count > 0 ? reviews.reduce((acc, curr) => acc + (curr.rating || 0), 0) / count : 0;
        setStats(prev => ({ ...prev, rating: avg, count }));
    });
    return () => unsubscribe();
  }, [course.id, db]);

  useEffect(() => {
    const q = query(collection(db, 'enrollments'), where('courseId', '==', course.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setStats(prev => ({ ...prev, studentCount: snapshot.size }));
    });
    return () => unsubscribe();
  }, [course.id, db]);

  useEffect(() => {
    if (!user?.uid || isListView) return;
    const wishlistRef = doc(db, 'users', user.uid, 'wishlist', course.id);
    const unsub = onSnapshot(wishlistRef, (docSnap) => {
      setIsWishlisted(docSnap.exists());
    });
    return () => unsub();
  }, [user?.uid, course.id, db, isListView]);

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

  // --- LAYOUT LIST (Admin/Mes Cours) ---
  if (isListView) {
    return (
      <div className="group relative">
        <Link href={href} className="block w-full">
          <div className="bg-card border border-border rounded-2xl overflow-hidden flex items-stretch transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 active:scale-[0.98]">
            <div className="relative w-28 sm:w-40 shrink-0 bg-muted overflow-hidden">
              <Image
                src={course.imageUrl || `https://picsum.photos/seed/${course.id}/300/200`}
                alt={course.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/10" />
            </div>

            <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
              <div className="space-y-1">
                <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary bg-primary/5 px-1.5 py-0">
                  {course.category}
                </Badge>
                <h3 className="font-bold text-sm sm:text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors uppercase tracking-tight">
                  {course.title}
                </h3>
              </div>

              <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>Progression</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1" indicatorClassName={cn(progress === 100 ? "bg-green-500" : "bg-primary")} />
                </div>
              </div>
            </div>
          </div>
        </Link>
        {actions && <div className="absolute top-2 right-2 flex gap-1">{actions}</div>}
      </div>
    );
  }

  // --- LAYOUT GRID (Udemy Exact Style) ---
  return (
    <Link href={href} className="block group">
      <div className="flex flex-col h-full bg-transparent transition-all duration-300 active:scale-[0.98]">
        {/* Thumbnail */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border/50 shadow-sm mb-3">
          <Image
            src={course.imageUrl || `https://picsum.photos/seed/${course.id}/600/400`}
            alt={course.title}
            fill
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

        {/* Content */}
        <div className="flex-1 flex flex-col gap-1">
          <h3 className="font-black text-[15px] leading-tight text-foreground line-clamp-2 uppercase tracking-tight group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          
          <p className="text-[11px] text-muted-foreground font-medium truncate">
            {instructor?.fullName || 'Expert Ndara'}
          </p>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-black text-[#CC7722]">
              {stats.rating > 0 ? stats.rating.toFixed(1).replace('.', ',') : "5,0"}
            </span>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={cn(
                    "h-3 w-3", 
                    i < (stats.rating || 5) ? "fill-[#CC7722] text-[#CC7722]" : "text-slate-700"
                  )} 
                />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground font-bold">
              ({stats.count || Math.floor(Math.random() * 10) + 1})
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <p className="font-black text-lg text-foreground">
              {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} FCFA` : 'OFFERT'}
            </p>
          </div>

          <div className="mt-2 flex gap-2">
             <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase px-2 py-0.5 rounded-sm">
                Nouveautés
             </Badge>
             {stats.studentCount > 5 && (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[9px] uppercase px-2 py-0.5 rounded-sm">
                    Meilleures ventes
                </Badge>
             )}
          </div>
        </div>
      </div>
    </Link>
  );
}
