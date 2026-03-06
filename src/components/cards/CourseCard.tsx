'use client';

/**
 * @fileOverview Carte de cours Ndara Afrique Unifiée.
 * ✅ FORMAT LISTE : Design horizontal compact identique à l'espace Admin.
 * ✅ TEMPS RÉEL : Écouteur d'avis Firestore intégré.
 */

import Link from 'next/link';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Star, Award, Heart, ChevronRight, BookOpen } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';

interface CourseCardProps {
  course: Course & { progress?: number; lastLessonId?: string };
  instructor: Partial<NdaraUser> | null;
  variant?: 'catalogue' | 'student';
  actions?: React.ReactNode;
}

export function CourseCard({ course, instructor, variant = 'catalogue', actions }: CourseCardProps) {
  const { user } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [stats, setStats] = useState({ rating: 0, count: 0 });
  
  const progress = course.progress ?? 0;
  const isStudentView = variant === 'student';
  const lessonQuery = course.lastLessonId ? `?lesson=${course.lastLessonId}` : '';
  const href = isStudentView ? `/student/courses/${course.id}${lessonQuery}` : `/courses/${course.id}`;

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
    if (!user?.uid || isStudentView) return;
    const wishlistRef = doc(db, 'users', user.uid, 'wishlist', course.id);
    const unsub = onSnapshot(wishlistRef, (docSnap) => {
      setIsWishlisted(docSnap.exists());
    });
    return () => unsub();
  }, [user?.uid, course.id, db, isStudentView]);

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

  return (
    <div className="group relative">
      <Link href={href} className="block w-full">
        <div className="bg-card border border-border rounded-2xl overflow-hidden flex items-stretch transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 active:scale-[0.98]">
          {/* Miniature Gauche (Style Admin) */}
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

          {/* Contenu Droite */}
          <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
            <div className="space-y-1">
              <div className="flex justify-between items-start gap-2">
                <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary bg-primary/5 px-1.5 py-0">
                  {course.category}
                </Badge>
                {!isStudentView && (
                  <button 
                    onClick={toggleWishlist}
                    className={cn("text-slate-400 hover:text-primary transition-colors", isWishlisted && "text-primary")}
                  >
                    <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")} />
                  </button>
                )}
              </div>
              <h3 className="font-bold text-sm sm:text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors uppercase tracking-tight">
                {course.title}
              </h3>
              
              {/* Infos Instructeur */}
              {instructor && (
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5 border border-border">
                    <AvatarImage src={instructor.profilePictureURL} />
                    <AvatarFallback className="text-[8px] font-bold">{instructor.fullName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase truncate">
                    {instructor.fullName}
                  </p>
                </div>
              )}
            </div>

            {/* Pied de carte : Progression ou Prix */}
            <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
              {isStudentView ? (
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>Progression</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1" indicatorClassName={cn(progress === 100 ? "bg-green-500" : "bg-primary")} />
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1">
                    <Star className={cn("h-3 w-3", stats.rating > 0 ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
                    <span className="text-[10px] font-bold text-foreground">{stats.rating > 0 ? stats.rating.toFixed(1) : "Nouveau"}</span>
                  </div>
                  <p className="font-black text-sm text-foreground">
                    {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'GRATUIT'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
      
      {/* Slot pour actions spécifiques (ex: boutons éditer/supprimer pour les formateurs) */}
      {actions && (
        <div className="absolute top-2 right-2 flex gap-1">
          {actions}
        </div>
      )}
    </div>
  );
}
