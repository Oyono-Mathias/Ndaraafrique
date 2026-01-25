
'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { collection, query, where, getFirestore, getDocs, doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import type { Course, NdaraUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard } from '@/components/cards/CourseCard';
import { Sparkles, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { SectionHeader } from '../dashboard/SectionHeader';
import { EmptyState } from '../dashboard/EmptyState';

interface RecommendedCourseItem {
  courseId: string;
  title: string;
  coverImage: string;
  instructorId: string;
  price: number;
}

interface UserRecommendations {
  courses: RecommendedCourseItem[];
}

export function RecommendedCourses() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
    const [isLoadingInstructors, setIsLoadingInstructors] = useState(true);

    const recommendationRef = useMemo(
        () => (isUserLoading || !currentUser) 
            ? null
            : doc(db, 'recommended_courses', currentUser.uid),
        [currentUser, isUserLoading, db]
    );

    const { data: recommendationDoc, isLoading: isRecsLoading } = useDoc<UserRecommendations>(recommendationRef);

    const recommendedCourses = useMemo(() => recommendationDoc?.courses || [], [recommendationDoc]);

    useEffect(() => {
        if (recommendedCourses.length === 0) {
            setIsLoadingInstructors(false);
            return;
        }

        const fetchInstructors = async () => {
            setIsLoadingInstructors(true);
            const instructorIds = [...new Set(recommendedCourses.map(c => c.instructorId).filter(Boolean))];
            if (instructorIds.length === 0) {
                setIsLoadingInstructors(false);
                return;
            }
            
            const newInstructors = new Map<string, Partial<NdaraUser>>();
            const idsToFetch = instructorIds.filter(id => !instructorsMap.has(id));

            if (idsToFetch.length > 0) {
                 const usersQuery = query(collection(db, 'users'), where('uid', 'in', idsToFetch.slice(0, 30)));
                 const userSnapshots = await getDocs(usersQuery);
                 userSnapshots.forEach(docSnap => {
                    const userData = docSnap.data() as NdaraUser;
                    newInstructors.set(userData.uid, { 
                        uid: userData.uid,
                        fullName: userData.fullName,
                        profilePictureURL: userData.profilePictureURL,
                    });
                });
            }
            setInstructorsMap(prev => new Map([...prev, ...newInstructors]));
            setIsLoadingInstructors(false);
        };
        
        fetchInstructors();
    }, [recommendedCourses, db, instructorsMap]);

    const finalIsLoading = isUserLoading || (recommendationRef !== null && (isRecsLoading || isLoadingInstructors));

    if (finalIsLoading) {
         return (
             <section>
                <SectionHeader title="Recommandés pour vous" />
                <div className="flex space-x-6 mt-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="w-[280px] shrink-0">
                           <Skeleton className="h-80 rounded-2xl bg-slate-800" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }
    
    if (recommendedCourses.length === 0) {
        return (
            <section>
                <SectionHeader title="Recommandés pour vous" />
                <div className="text-center p-8 mt-4 bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-2xl">
                    <EmptyState
                      icon={Sparkles}
                      title="Affinez vos recommandations"
                      description="Plus vous suivez de cours, meilleures seront vos recommandations ! En attendant, pourquoi ne pas explorer notre catalogue ?"
                    />
                    <Button asChild className="mt-6">
                        <Link href="/search">
                            <Search className="h-4 w-4 mr-2" />
                            Explorer les cours
                        </Link>
                    </Button>
                </div>
            </section>
        );
    }
    
    const coursesForCard: Course[] = recommendedCourses.map(rec => ({
        id: rec.courseId,
        title: rec.title,
        imageUrl: rec.coverImage,
        price: rec.price,
        instructorId: rec.instructorId,
        description: '',
        category: '',
        status: 'Published'
    }));

    return (
        <section>
            <SectionHeader title="Recommandés pour vous" />
            <Carousel opts={{ align: "start", loop: false }} className="w-full mt-4">
                <CarouselContent className="-ml-6">
                    {coursesForCard.map(course => (
                        <CarouselItem key={course.id} className="pl-6 basis-[80%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                            <CourseCard 
                                course={course} 
                                instructor={instructorsMap.get(course.instructorId) || null}
                                variant="catalogue" 
                            />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </section>
    );
}
