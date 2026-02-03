'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy, getDocs, doc, documentId } from 'firebase/firestore';
import type { Review, Course, NdaraUser } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Frown } from 'lucide-react';
import { cn } from '@/lib/utils';

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={cn(
          "w-4 h-4",
          i < rating ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-600"
        )}
      />
    ))}
  </div>
);

interface EnrichedReview extends Review {
  student?: Partial<NdaraUser>;
  course?: Partial<Course>;
}

const ReviewCard = ({ review }: { review: EnrichedReview }) => (
  <Card className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 shadow-sm">
    <CardHeader>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={review.student?.profilePictureURL} />
            <AvatarFallback>{review.student?.fullName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-slate-800 dark:text-white">{review.student?.fullName || 'Anonyme'}</p>
            <p className="text-xs text-slate-500 dark:text-muted-foreground">{review.course?.title || 'Cours inconnu'}</p>
          </div>
        </div>
        <StarRating rating={review.rating} />
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{review.comment}"</p>
    </CardContent>
    <CardFooter>
      <p className="text-xs text-slate-400 dark:text-muted-foreground">
        {(review.createdAt as any)?.toDate?.() 
          ? formatDistanceToNow((review.createdAt as any).toDate(), { locale: fr, addSuffix: true }) 
          : "À l'instant"}
      </p>
    </CardFooter>
  </Card>
);

export default function AvisPage() {
  const db = getFirestore();
  const { currentUser, isUserLoading } = useRole();

  const [courseFilter, setCourseFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  
  const coursesQuery = useMemo(
    () => currentUser ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid)) : null,
    [db, currentUser]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const reviewsQuery = useMemo(
    () => currentUser ? query(collection(db, 'reviews'), where('instructorId', '==', currentUser.uid), orderBy('createdAt', 'desc')) : null,
    [db, currentUser]
  );
  const { data: reviews, isLoading: reviewsLoading } = useCollection<Review>(reviewsQuery);
  
  const [enrichedReviews, setEnrichedReviews] = useState<EnrichedReview[]>([]);
  const [relatedDataLoading, setRelatedDataLoading] = useState(true);

  useEffect(() => {
    if (!reviews) {
        setRelatedDataLoading(false);
        return;
    };

    const enrichData = async () => {
        setRelatedDataLoading(true);

        const studentIds = [...new Set(reviews.map(r => r.userId))];
        const courseIds = [...new Set(reviews.map(r => r.courseId))];

        const studentsMap = new Map<string, Partial<NdaraUser>>();
        const coursesMap = new Map<string, Partial<Course>>();

        if (studentIds.length > 0) {
            for (let i = 0; i < studentIds.length; i += 30) {
                const chunk = studentIds.slice(i, i + 30);
                if (chunk.length === 0) continue;
                const q = query(collection(db, 'users'), where('uid', 'in', chunk));
                const snapshot = await getDocs(q);
                snapshot.forEach(doc => studentsMap.set(doc.id, doc.data() as NdaraUser));
            }
        }
        
        if (courseIds.length > 0) {
             for (let i = 0; i < courseIds.length; i += 30) {
                const chunk = courseIds.slice(i, i + 30);
                if (chunk.length === 0) continue;
                const q = query(collection(db, 'courses'), where(documentId(), 'in', chunk));
                const snapshot = await getDocs(q);
                snapshot.forEach(doc => coursesMap.set(doc.id, doc.data() as Course));
            }
        }
        
        const newEnrichedData = reviews.map(r => ({
            ...r,
            student: studentsMap.get(r.userId),
            course: coursesMap.get(r.courseId)
        }));
        
        setEnrichedReviews(newEnrichedData);
        setRelatedDataLoading(false);
    };

    enrichData();
  }, [reviews, db]);
  
  const filteredData = useMemo(() => {
    return enrichedReviews.filter(item => {
        const courseMatch = courseFilter === 'all' || item.courseId === courseFilter;
        const ratingMatch = ratingFilter === 'all' || item.rating === parseInt(ratingFilter);
        return courseMatch && ratingMatch;
    });
  }, [enrichedReviews, courseFilter, ratingFilter]);
  
  const isLoading = isUserLoading || coursesLoading || reviewsLoading || relatedDataLoading;
  
  return (
    <div className="space-y-8 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Avis des étudiants</h1>
        <p className="text-slate-500 dark:text-muted-foreground">Consultez les notes et commentaires laissés sur vos formations.</p>
      </header>

      <Card className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={courseFilter} onValueChange={setCourseFilter} disabled={isLoading}>
              <SelectTrigger className="w-full sm:w-[250px] h-11 text-base bg-white dark:bg-slate-800"><SelectValue placeholder="Filtrer par cours..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les cours</SelectItem>
                {courses?.map(course => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter} disabled={isLoading}>
              <SelectTrigger className="w-full sm:w-[180px] h-11 text-base bg-white dark:bg-slate-800"><SelectValue placeholder="Filtrer par note..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les notes</SelectItem>
                <SelectItem value="5">5 étoiles</SelectItem>
                <SelectItem value="4">4 étoiles</SelectItem>
                <SelectItem value="3">3 étoiles</SelectItem>
                <SelectItem value="2">2 étoiles</SelectItem>
                <SelectItem value="1">1 étoile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
           {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg bg-slate-200 dark:bg-slate-800" />)}
                </div>
            ) : filteredData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    {filteredData.map(review => <ReviewCard key={review.id} review={review} />)}
                </div>
            ) : (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl mt-4">
                    <Frown className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Aucun avis disponible pour le moment</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Les avis de vos étudiants apparaîtront ici.</p>
                </div>
            )}
          
        </CardContent>
      </Card>
    </div>
  );
}