

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRole } from '@/context/RoleContext';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Course, Review } from '@/lib/types';
import type { NdaraUser } from '@/context/RoleContext';


interface ReviewWithDetails extends Review {
  courseTitle: string;
  studentName: string;
  studentImage?: string;
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={cn(
          'h-4 w-4',
          i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-slate-600'
        )}
      />
    ))}
  </div>
);

const ReviewRowMobile = ({ review }: { review: ReviewWithDetails }) => (
    <Card className="dark:bg-slate-800">
        <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10 border">
                    <AvatarImage src={review.studentImage} />
                    <AvatarFallback>{review.studentName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold dark:text-white">{review.studentName}</p>
                    <StarRating rating={review.rating} />
                </div>
            </div>
            <p className="text-sm italic text-muted-foreground dark:text-slate-400">"{review.comment}"</p>
            <div className="text-xs pt-2 border-t dark:border-slate-700">
                <p className="font-medium text-slate-600 dark:text-slate-300">{review.courseTitle}</p>
                <p className="text-muted-foreground dark:text-slate-500">
                    {review.createdAt ? format(review.createdAt.toDate(), 'dd MMM yyyy', { locale: fr }) : 'N/A'}
                </p>
            </div>
        </CardContent>
    </Card>
);

export default function ReviewsPage() {
  const { formaAfriqueUser: ndaraUser, isUserLoading } = useRole();
  const db = getFirestore();

  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllReviews = useCallback(async (instructorId: string) => {
    setIsLoading(true);

    try {
      // 1. Get all courses for the instructor to create a map for titles
      const coursesQuery = query(collection(db, 'courses'), where('instructorId', '==', instructorId));
      const coursesSnapshot = await getDocs(coursesQuery);
      const coursesMap = new Map<string, Course>(coursesSnapshot.docs.map(doc => [doc.id, doc.data() as Course]));
      
      // 2. Fetch all reviews for this instructor directly
      const reviewsQuery = query(collection(db, 'reviews'), where('instructorId', '==', instructorId), orderBy('createdAt', 'desc'));
      const reviewsSnapshot = await getDocs(reviewsQuery);
      
      const allReviews = reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));

      if (allReviews.length === 0) {
        setReviews([]);
        setIsLoading(false);
        return;
      }

      // 3. Get all unique student details
      const userIds = [...new Set(allReviews.map(r => r.userId))];
      const userPromises = [];
      const usersMap = new Map<string, NdaraUser>();
      // Batch user fetching
      for (let i = 0; i < userIds.length; i += 30) {
          const chunk = userIds.slice(i, i + 30);
          const usersQuery = query(collection(db, 'users'), where('uid', 'in', chunk));
          userPromises.push(getDocs(usersQuery));
      }

      const userSnapshots = await Promise.all(userPromises);
      userSnapshots.flatMap(snapshot => snapshot.docs).forEach(doc => {
          usersMap.set(doc.data().uid, doc.data() as NdaraUser);
      });

      // 4. Populate and set reviews
      const populatedReviews = allReviews.map(review => ({
        ...review,
        courseTitle: coursesMap.get(review.courseId)?.title || 'Cours inconnu',
        studentName: usersMap.get(review.userId)?.fullName || 'Anonyme',
        studentImage: usersMap.get(review.userId)?.profilePictureURL,
      }));
      
      setReviews(populatedReviews);

    } catch (error) {
      console.error("Error fetching all reviews:", error);
    } finally {
      setIsLoading(false);
    }
  }, [db]);
  
  useEffect(() => {
    if (!isUserLoading && ndaraUser?.uid) {
        fetchAllReviews(ndaraUser.uid);
    } else if (!isUserLoading) {
        setIsLoading(false);
    }
  }, [ndaraUser, isUserLoading, fetchAllReviews]);


  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Avis des étudiants</h1>
        <p className="text-muted-foreground dark:text-slate-400">Consultez les retours sur vos formations.</p>
      </header>

      <Card className="dark:bg-[#1e293b] dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Derniers avis reçus</CardTitle>
          <CardDescription className="dark:text-slate-400">Lisez ce que vos étudiants pensent de vos cours.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-slate-700">
                    <TableHead className="dark:text-slate-300">Étudiant</TableHead>
                    <TableHead className="dark:text-slate-300">Note</TableHead>
                    <TableHead className="dark:text-slate-300">Commentaire</TableHead>
                    <TableHead className="dark:text-slate-300">Cours</TableHead>
                    <TableHead className="dark:text-slate-300">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i} className="dark:border-slate-700">
                        <TableCell><Skeleton className="h-10 w-32 dark:bg-slate-700" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24 dark:bg-slate-700" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full dark:bg-slate-700" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32 dark:bg-slate-700" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24 dark:bg-slate-700" /></TableCell>
                      </TableRow>
                    ))
                  ) : reviews.length > 0 ? (
                    reviews.map((review) => (
                      <TableRow key={review.id} className="dark:border-slate-700">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={review.studentImage} />
                              <AvatarFallback>{review.studentName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium dark:text-slate-100">{review.studentName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StarRating rating={review.rating} />
                        </TableCell>
                        <TableCell className="text-muted-foreground dark:text-slate-400">{review.comment}</TableCell>
                        <TableCell className="font-medium dark:text-slate-200">{review.courseTitle}</TableCell>
                        <TableCell className="text-muted-foreground dark:text-slate-500 text-sm">
                            {review.createdAt ? format(review.createdAt.toDate(), 'dd MMM yyyy', { locale: fr }) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground dark:text-slate-400">
                        <MessageCircle className="mx-auto h-10 w-10 mb-2" />
                        Aucun avis pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
          </div>
          <div className="md:hidden space-y-4">
              {isLoading ? (
                 [...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 w-full dark:bg-slate-700" />)
              ) : reviews.length > 0 ? (
                  reviews.map((review) => <ReviewRowMobile key={review.id} review={review} />)
              ) : (
                 <div className="h-32 text-center text-muted-foreground flex items-center justify-center flex-col gap-2 dark:text-slate-400">
                    <MessageCircle className="h-10 w-10" />
                    Aucun avis pour le moment.
                 </div>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
