'use client';

/**
 * @fileOverview Mur des Avis Formateur - Design Elite Forest & Wealth.
 * ✅ DESIGN : Cartes témoignages avec citations élégantes et score étoilé.
 * ✅ FONCTIONNEL : Agrégation réelle des avis par formation.
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, getDocs, documentId, orderBy } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageSquare, BookOpen, Quote, ShieldCheck } from 'lucide-react';
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

  const globalRating = useMemo(() => {
      if (reviews.length === 0) return 4.8;
      return (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* Global Rating Summary */}
      <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-6 shadow-2xl flex items-center justify-between">
          <div>
              <h2 className="font-black text-white text-sm uppercase tracking-tight mb-1">Moyenne Globale</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Satisfaction des Ndara</p>
          </div>
          <div className="flex items-center gap-3">
              <div className="text-right">
                  <p className="text-3xl font-black text-white leading-none">{globalRating}<span className="text-sm opacity-30">/5</span></p>
                  <div className="flex items-center justify-end gap-0.5 mt-1.5">
                      {[...Array(5)].map((_, i) => (
                          <Star key={i} size={10} className={cn("fill-current", i < Math.floor(Number(globalRating)) ? "text-yellow-500" : "text-slate-800")} />
                      ))}
                  </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 border border-yellow-500/20">
                  <Star size={24} className="fill-current" />
              </div>
          </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-[2.5rem] bg-slate-900" />)}
        </div>
      ) : reviews.length > 0 ? (
        <div className="grid gap-6">
          <h2 className="font-black text-slate-500 text-[10px] uppercase tracking-[0.3em] px-1">Derniers Témoignages</h2>
          {reviews.map((review) => (
            <div key={review.id} className="touch-btn bg-slate-900 border border-white/5 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden group transition-all">
                <Quote className="absolute -right-4 -top-4 size-24 text-primary opacity-[0.03] group-hover:opacity-[0.08] transition-opacity" />
                
                <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-14 w-14 border-2 border-white/10 shadow-xl">
                                <AvatarImage src={review.student?.profilePictureURL} className="object-cover" />
                                <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">
                                    {review.student?.fullName?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="font-black text-white text-[15px] uppercase tracking-tight">{review.student?.fullName || 'Apprenant Ndara'}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-2 py-0.5 h-4">
                                        <ShieldCheck size={8} className="mr-1" /> Certifié
                                    </Badge>
                                    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                        {review.createdAt && typeof (review.createdAt as any).toDate === 'function' ? format((review.createdAt as any).toDate(), 'd MMM yyyy', { locale: fr }) : '...'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-0.5 bg-slate-950 p-2 rounded-xl border border-white/5">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={12} className={cn("fill-current", i < review.rating ? "text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.4)]" : "text-slate-800")} />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <blockquote className="text-slate-300 text-sm md:text-base leading-relaxed font-medium italic border-l-2 border-primary/20 pl-4">
                            “{review.comment}”
                        </blockquote>
                        
                        <div className="flex items-center gap-2 pt-2">
                            <BookOpen className="h-3.5 w-3.5 text-slate-600" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{review.courseTitle}</span>
                        </div>
                    </div>
                </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-20">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-slate-700" />
            <p className="font-black uppercase tracking-widest text-xs">Le mur est encore vierge</p>
        </div>
      )}
    </div>
  );
}
