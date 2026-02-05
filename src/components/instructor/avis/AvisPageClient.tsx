
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy, getDocs, documentId } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageSquare, Frown, BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Review, Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';

export function AvisPageClient() {
  const db = getFirestore();
  const { currentUser } = useRole();
  const [reviews, setReviews] = useState<(Review & { student?: NdaraUser; courseTitle?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Récupération des avis
  const reviewsQuery = useMemo(
    () => currentUser ? query(collection(db, 'reviews'), where('instructorId', '==', currentUser.uid), orderBy('createdAt', 'desc')) : null,
    [db, currentUser]
  );
  const { data: rawReviews, isLoading: reviewsLoading } = useCollection<Review>(reviewsQuery);

  useEffect(() => {
    if (!rawReviews || reviewsLoading) return;

    const enrichReviews = async () => {
      setIsLoading(true);
      try {
        const studentIds = [...new Set(rawReviews.map(r => r.userId))];
        const courseIds = [...new Set(rawReviews.map(r => r.courseId))];

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

        const enriched = rawReviews.map(r => ({
          ...r,
          student: studentsMap.get(r.userId),
          courseTitle: coursesMap.get(r.courseId) || 'Cours inconnu'
        }));

        setReviews(enriched);
      } catch (error) {
        console.error("Error enriching reviews:", error);
      } finally {
        setIsLoading(false);
      }
    };

    enrichReviews();
  }, [rawReviews, reviewsLoading, db]);

  if (isLoading || reviewsLoading) {
    return (
      <div className="grid gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl bg-slate-900" />)}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/20 rounded-3xl border-2 border-dashed border-slate-800">
        <MessageSquare className="h-12 w-12 mb-4 text-slate-700" />
        <h3 className="text-lg font-bold text-white uppercase">Aucun avis pour le moment</h3>
        <p className="text-slate-500 text-sm mt-1">Vos premiers retours d'étudiants apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {reviews.map((review) => (
        <Card key={review.id} className="bg-slate-900 border-slate-800 overflow-hidden shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Avatar className="h-12 w-12 border-2 border-slate-800 shadow-lg">
                <AvatarImage src={review.student?.profilePictureURL} />
                <AvatarFallback className="bg-slate-800 text-primary font-black">
                  {review.student?.fullName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white">{review.student?.fullName || 'Étudiant Ndara'}</h3>
                    <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest mt-0.5">
                      <BookOpen className="h-3 w-3" />
                      {review.courseTitle}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-800/50 px-2 py-1 rounded-lg">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={cn("h-3 w-3", i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-slate-700")} 
                      />
                    ))}
                  </div>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed italic">
                  "{review.comment}"
                </p>

                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">
                  Le {format((review.createdAt as any).toDate(), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
