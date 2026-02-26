
'use client';

/**
 * @fileOverview Carte de cours Ndara Afrique.
 * Supporte le mode Catalogue (Prix/Favoris) et le mode Étudiant (Progression).
 */

import Link from 'next/link';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Star, Award, Heart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';

interface CourseCardProps {
  course: Course & { progress?: number; lastLessonId?: string };
  instructor: Partial<NdaraUser> | null;
  variant?: 'catalogue' | 'student';
}

const StarRating = ({ rating, reviewCount }: { rating: number, reviewCount: number }) => (
    <div className="flex items-center gap-1.5 text-sm text-slate-400">
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        <span className="font-bold text-slate-200">{rating.toFixed(1)}</span>
        <span className="text-[10px] opacity-60">({reviewCount.toLocaleString()})</span>
    </div>
);

export function CourseCard({ course, instructor, variant = 'catalogue' }: CourseCardProps) {
  const { user } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  const progress = course.progress ?? 0;
  const isStudentView = variant === 'student';
  
  // Reprise intelligente du cours
  const lessonQuery = course.lastLessonId ? `?lesson=${course.lastLessonId}` : '';
  const href = isStudentView ? `/student/courses/${course.id}${lessonQuery}` : `/courses/${course.id}`;

  // Écouter le statut du favori pour cet utilisateur
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
        await setDoc(wishlistRef, { 
            courseId: course.id,
            addedAt: serverTimestamp() 
        });
        toast({ title: "Ajouté aux favoris !" });
      }
    } catch (error) {
      console.error("Wishlist Error:", error);
      toast({ variant: 'destructive', title: "Action impossible" });
    }
  };

  return (
    <Link href={href} className="block group w-full h-full">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden h-full flex flex-col transition-all duration-300 hover:border-primary/50 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10">
        <div className="relative aspect-video overflow-hidden bg-slate-800">
          <Image
            src={course.imageUrl || `https://picsum.photos/seed/${course.id}/600/450`}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Bouton Favoris (Wishlist) */}
          <div className="absolute top-3 right-3 z-10">
            {!isStudentView && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleWishlist}
                className={cn(
                  "h-10 w-10 rounded-full backdrop-blur-md transition-all active:scale-90",
                  isWishlisted ? "bg-primary text-white" : "bg-black/40 text-white hover:bg-black/60"
                )}
              >
                <Heart className={cn("h-5 w-5", isWishlisted && "fill-current")} />
              </Button>
            )}
          </div>

          {(course.isPopular || course.price === 0) && (
             <Badge className={cn("absolute top-3 left-3 font-black border-none text-[9px] uppercase", course.price === 0 ? "bg-green-500 text-white" : "bg-primary text-white")}>
                {course.price === 0 ? "GRATUIT" : "POPULAIRE"}
            </Badge>
          )}
        </div>

        <div className="p-5 flex flex-col flex-grow">
          <h3 className="font-bold text-base text-white line-clamp-2 leading-tight mb-4 group-hover:text-primary transition-colors uppercase tracking-tight">{course.title}</h3>
          
          {instructor?.fullName && (
             <div className="flex items-center gap-2 mt-auto">
                <Avatar className="h-6 w-6 border border-slate-700">
                    <AvatarImage src={instructor.profilePictureURL} />
                    <AvatarFallback className="text-[10px] bg-slate-800 font-bold">{instructor.fullName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{instructor.fullName}</p>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-slate-800">
            {isStudentView ? (
              progress === 100 ? (
                <div className="flex items-center gap-2 text-green-400 font-black text-[10px] uppercase tracking-widest">
                  <Award className="h-4 w-4" />
                  <span>Certifié Ndara</span>
                </div>
              ) : (
                <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                        <span>Progression</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1 bg-slate-800" indicatorClassName="bg-primary" />
                </div>
              )
            ) : (
              <div className="flex items-center justify-between">
                <StarRating rating={4.8} reviewCount={124} />
                <p className="font-black text-lg text-white">
                  {course.price > 0 ? `${course.price.toLocaleString('fr-FR')}` : 'GRATUIT'}
                  {course.price > 0 && <span className="text-[10px] ml-1 text-slate-500 uppercase">XOF</span>}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
