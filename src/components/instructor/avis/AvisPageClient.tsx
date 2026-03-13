'use client';

/**
 * @fileOverview Mur des Avis Formateur (Elite Design).
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageSquare, BookOpen, Quote } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Review, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';

export function AvisPageClient() {
  const db = getFirestore();
  const { currentUser } = useRole();
  const [reviews, setReviews] = useState<(Review & { student?: NdaraUser; courseTitle?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reviewsQuery = useMemo(
    () => currentUser ? query(collection(db, 'course_reviews'), where('instructorId', '==', currentUser.uid)) : null,
    [db, currentUser]
  );
  const { data: rawReviews, isLoading: reviewsLoading } = useCollection<Review>(reviewsQuery);

  useEffect(() => {
    if (!rawReviews || reviewsLoading) return;

    const enrichReviews = async () => {
      setIsLoading(true);
      try {
        const sorted = [...rawReviews].sort((a, b) => {
            const dateA = (a.createdAt as any)?.toDate?.() || new Date(0);
            const dateB = (b.createdAt as any)?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        const studentIds = [...new Set(sorted.map(r => r.studentId))];
        const courseIds = [...new Set(sorted.map(r => r.courseId))];

        const studentsMap = new Map<string, NdaraUser>();
        const coursesMap = new Map<string, string>();

        if (studentIds.length > 0) {
          const studentsSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', studentIds.slice(0, 30))));
          studentsSnap.forEach(d => studentsMap.set(d.id, d.data() as NdaraUser));
        }

        if (courseIds.length > 0) {
          const coursesSnap = await getDocs(query(collection(db, 'courses'), where(documentId(), 'in', courseIds.slice(0, 30))));
          coursesSnap.forEach(d => coursesMap.set(d.id, d.data().title));
        }

        setReviews(sorted.map(r => ({
          ...r,
          student: studentsMap.get(r.studentId),
          courseTitle: coursesMap.get(r.courseId) || 'Formation'
        })));
      } catch (error) {
        console.error("Enrichment error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    enrichReviews();
  }, [rawReviews, reviewsLoading, db]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-[2rem] bg-slate-900" />)}
        </div>
      ) : reviews.length > 0 ? (
        <div className="grid gap-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden group active:scale-[0.98] transition-all">
                <Quote className="absolute -right-4 -top-4 size-24 text-primary opacity-[0.03] group-hover:opacity-[0.08] transition-opacity" />
                
                <div className="relative z-10 flex items-start gap-4">
                    <Avatar className="h-14 w-14 border-2 border-white/10 shadow-xl">
                        <AvatarImage src={review.student?.profilePictureURL} />
                        <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">{review.student?.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="font-black text-white text-[15px] uppercase tracking-tight">{review.student?.fullName || 'Étudiant Ndara'}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <BookOpen className="h-3 w-3 text-primary" />
                                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest truncate max-w-[150px]">{review.courseTitle}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-0.5 bg-slate-950 p-1.5 rounded-xl border border-white/5">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={12} className={cn("fill-current transition-all", i < review.rating ? "text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.4)]" : "text-slate-800")} />
                                ))}
                            </div>
                        </div>

                        <blockquote className="text-slate-300 text-sm leading-relaxed font-medium italic pt-2">
                            “{review.comment}”
                        </blockquote>

                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest pt-2">
                            Publié le {review.createdAt && typeof (review.createdAt as any).toDate === 'function' ? format((review.createdAt as any).toDate(), 'dd MMMM yyyy', { locale: fr }) : 'récemment'}
                        </p>
                    </div>
                </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-20">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-slate-700" />
            <p className="font-black uppercase tracking-widest text-xs">Aucun témoignage disponible</p>
        </div>
      )}
    </div>
  );
}
