
'use client';

import { useState, useEffect, useMemo } from 'react';
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

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Course, Review } from '@/lib/types';


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
          i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
        )}
      />
    ))}
  </div>
);

export default function ReviewsPage() {
  const { formaAfriqueUser, isUserLoading } = useRole();
  const db = getFirestore();

  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!formaAfriqueUser?.uid || !formaAfriqueUser.isInstructorApproved) {
      if (!isUserLoading) setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const reviewsQuery = query(
        collection(db, 'reviews'),
        where('instructorId', '==', formaAfriqueUser.uid),
        orderBy('createdAt', 'desc')
    );

    const unsubscribeReviews = onSnapshot(reviewsQuery, async (reviewSnapshot) => {
        const reviewsData = reviewSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        
        if (reviewsData.length === 0) {
             setReviews([]);
             setIsLoading(false);
             return;
        }

        // Fetch user and course details
        const userIds = [...new Set(reviewsData.map(r => r.userId))];
        const courseIds = [...new Set(reviewsData.map(r => r.courseId))];

        const usersMap = new Map();
        if (userIds.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', userIds.slice(0, 30)));
            const userSnapshots = await getDocs(usersQuery);
            userSnapshots.forEach(doc => usersMap.set(doc.data().uid, doc.data()));
        }

        const coursesMap = new Map();
        if (courseIds.length > 0) {
            const coursesQuery = query(collection(db, 'courses'), where('__name__', 'in', courseIds.slice(0, 30)));
            const courseSnapshots = await getDocs(coursesQuery);
            courseSnapshots.forEach(doc => coursesMap.set(doc.id, doc.data()));
        }

        // Combine all data
        const populatedReviews = reviewsData.map(review => {
            const course = coursesMap.get(review.courseId);
            const user = usersMap.get(review.userId);
            return {
                ...review,
                courseTitle: course?.title || 'Cours inconnu',
                studentName: user?.fullName || 'Anonyme',
                studentImage: user?.profilePictureURL,
            };
        });
        
        setReviews(populatedReviews);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching reviews:", error);
        setIsLoading(false);
    });

    return () => {
      unsubscribeReviews();
    };

  }, [formaAfriqueUser, isUserLoading, db]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Avis des étudiants</h1>
        <p className="text-muted-foreground">Consultez les retours sur vos formations.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Derniers avis reçus</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Étudiant</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Commentaire</TableHead>
                <TableHead>Cours</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : reviews.length > 0 ? (
                reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={review.studentImage} />
                          <AvatarFallback>{review.studentName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{review.studentName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StarRating rating={review.rating} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{review.comment}</TableCell>
                    <TableCell className="font-medium">{review.courseTitle}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                        {review.createdAt ? format(review.createdAt.toDate(), 'dd MMM yyyy', { locale: fr }) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Aucun avis pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
