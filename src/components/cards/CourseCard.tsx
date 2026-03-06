'use client';

/**
 * @fileOverview Carte de cours Ndara Afrique Multi-Style.
 * ✅ MODE GRID (Udemy) : Pour le catalogue, la recherche et la landing page.
 * ✅ MODE LIST (Admin) : Pour les sections "Mes Cours" (Étudiant & Formateur).
 */

import Link from 'next/link';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Star, Heart, BookOpen } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';

interface CourseCardProps {
  course: Course & { progress?: number; lastLessonId?: string };
  instructor: Partial<NdaraUser> | null;
  variant?: 'grid' | 'list'; // 'grid' = Udemy style, 'list' = Admin style
  actions?: React.ReactNode;
}

export function CourseCard({ course, instructor, variant = 'grid', actions }: CourseCardProps) {
  const { user } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [stats, setStats] = useState({ rating: 0, count: 0 });
  
  const progress = course.progress ?? 0;
  const isListView = variant === 'list';
  const lessonQuery = course.lastLessonId ? `?lesson=${course.lastLessonId}` : '';
  const href = isListView ? `/student/courses/${course.id}${lessonQuery}` : `/courses/${course.id}`;

  useEffect(() => {
    const q = query(collection(db, 'reviews'), where('courseId', '==', course.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const reviews = snapshot.docs.map(d => d.data());
        const count = reviews.length;
        const avg = count > 0 ? reviews.reduce((acc, curr) => acc + (curr.rating || 0), 0) / count : 0;
        setStats({ rating: avg, count });
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
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/10" />
            </div>

            <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
              <div className="space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary bg-primary/5 px-1.5 py-0">
                    {course.category}
                  </Badge>
                </div>
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

  // --- LAYOUT GRID (Udemy style / Catalogue) ---
  return (
    <Link href={href} className="block group">
      <div className="bg-card border border-border rounded-[2rem] overflow-hidden flex flex-col h-full transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 active:scale-[0.98]">
        {/* Grande image en haut */}
        <div className="relative aspect-video w-full bg-muted overflow-hidden">
          <Image
            src={course.imageUrl || `https://picsum.photos/seed/${course.id}/600/400`}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          
          <button 
            onClick={toggleWishlist}
            className={cn(
              "absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md border border-white/20 transition-all active:scale-90",
              isWishlisted ? "bg-primary text-white" : "bg-black/20 text-white hover:bg-black/40"
            )}
          >
            <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")} />
          </button>
        </div>

        {/* Corps de carte */}
        <div className="p-6 flex-1 flex flex-col gap-4">
          <div className="space-y-3">
            <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-black text-[9px] uppercase tracking-widest px-2 py-0.5">
              {course.category}
            </Badge>
            <h3 className="font-black text-lg text-foreground line-clamp-2 leading-tight uppercase tracking-tight group-hover:text-primary transition-colors">
              {course.title}
            </h3>
          </div>

          <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {instructor && (
                <>
                  <Avatar className="h-7 w-7 border border-border">
                    <AvatarImage src={instructor.profilePictureURL} />
                    <AvatarFallback className="text-[9px] font-black bg-muted text-muted-foreground">{instructor.fullName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">{instructor.fullName}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className={cn("h-3 w-3", stats.rating > 0 ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
                      <span className="text-[10px] font-black text-foreground">{stats.rating > 0 ? stats.rating.toFixed(1) : "Nouveau"}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="text-right">
              <p className="text-lg font-black text-foreground">
                {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'OFFERT'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
