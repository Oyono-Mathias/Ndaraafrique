
'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { collection, query, where, getFirestore, getDocs, doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/provider';
import type { Course, NdaraUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard } from '@/components/cards/CourseCard';
import { Sparkles, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';

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
    const { currentUser, loading } = useRole(); // Utilise l'état de chargement combiné
    const db = getFirestore();
    const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
    const [isLoadingInstructors, setIsLoadingInstructors] = useState(true);

    // Cette condition est maintenant plus robuste et attend que le rôle soit confirmé.
    const recommendationRef = useMemoFirebase(
        () => (loading || !currentUser || currentUser.role === 'admin') 
            ? null
            : doc(db, 'recommended_courses', currentUser.uid),
        [currentUser, loading, db]
    );

    const { data: recommendationDoc, isLoading: isRecsLoading } = useDoc<UserRecommendations>(recommendationRef);

    const recommendedCourses = useMemo(() => recommendationDoc?.courses || [], [recommendationDoc]);

    useEffect(() => {
        if (recommendedCourses.length === 0) {
            setIsLoadingInstructors(false);
            return;
        };

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
                 userSnapshots.forEach(doc => {
                    const userData = doc.data() as NdaraUser;
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

    const finalIsLoading = loading || (recommendationRef !== null && (isRecsLoading || isLoadingInstructors));

    // Sécurité supplémentaire : ne jamais rien rendre si c'est un admin.
    if (currentUser?.role === 'admin') {
        return null;
    }

    if (finalIsLoading) {
         return (
             <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Recommandés pour vous</h2>
                <div className="flex space-x-6">
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
                <h2 className="text-2xl font-bold mb-4 text-white">Recommandés pour vous</h2>
                <div className="text-center p-8 bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-2xl">
                    <Sparkles className="mx-auto h-12 w-12 text-primary/80 mb-4" />
                    <h3 className="font-bold text-lg text-white">Affinez vos recommandations</h3>
                    <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">Plus vous suivez de cours, meilleures seront vos recommandations ! En attendant, pourquoi ne pas explorer notre catalogue ?</p>
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
            <h2 className="text-2xl font-bold mb-4 text-white">Recommandés pour vous</h2>
            <Carousel opts={{ align: "start", loop: false }} className="w-full">
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
