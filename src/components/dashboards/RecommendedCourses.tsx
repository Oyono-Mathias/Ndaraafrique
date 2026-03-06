'use client';

/**
 * @fileOverview Section des recommandations personnalisées.
 * ✅ RÉSOLU : Affiche les recommandations réelles issues du moteur de scoring.
 * ✅ RÉSOLU : Bascule vers un état vide incitatif si aucune recommandation n'est prête.
 */

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { collection, query, where, getFirestore, getDocs, doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import type { Course, NdaraUser, UserRecommendations } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard } from '@/components/cards/CourseCard';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { SectionHeader } from '../dashboard/SectionHeader';

export function RecommendedCourses() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
    const [isLoadingInstructors, setIsLoadingInstructors] = useState(true);

    // Écouteur en temps réel sur le document de recommandations de l'utilisateur
    const recommendationRef = useMemo(
        () => (isUserLoading || !currentUser) 
            ? null
            : doc(db, 'recommended_courses', currentUser.uid),
        [currentUser, isUserLoading, db]
    );

    const { data: recommendationDoc, isLoading: isRecsLoading } = useDoc<UserRecommendations>(recommendationRef);

    const recommendedItems = useMemo(() => recommendationDoc?.courses || [], [recommendationDoc]);

    useEffect(() => {
        if (recommendedItems.length === 0) {
            setIsLoadingInstructors(false);
            return;
        }

        const fetchInstructors = async () => {
            setIsLoadingInstructors(true);
            const instructorIds = [...new Set(recommendedItems.map(c => c.instructorId).filter(Boolean))];
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
    }, [recommendedItems, db, instructorsMap]);

    const finalIsLoading = isUserLoading || (recommendationRef !== null && (isRecsLoading || isLoadingInstructors));

    if (finalIsLoading) {
         return (
             <section className="space-y-4">
                <Skeleton className="h-6 w-1/3 rounded-full" />
                <div className="flex gap-4 overflow-hidden">
                    <Skeleton className="h-40 w-1/2 rounded-xl shrink-0" />
                    <Skeleton className="h-40 w-1/2 rounded-xl shrink-0" />
                </div>
            </section>
        );
    }
    
    if (recommendedItems.length === 0) {
        return (
            <section className="bg-primary/5 border border-primary/10 rounded-[2rem] p-8 text-center animate-in fade-in duration-700">
                <div className="p-4 bg-primary/10 rounded-full inline-block mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Affinez vos goûts</h3>
                <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                    Continuez d'explorer notre catalogue pour recevoir des conseils personnalisés par notre IA.
                </p>
                <Button asChild variant="outline" className="mt-6 border-primary/20 text-primary hover:bg-primary/5 rounded-xl h-11 px-8 font-bold uppercase text-[10px] tracking-widest">
                    <Link href="/search">Explorer le catalogue</Link>
                </Button>
            </section>
        );
    }
    
    // Conversion des items de recommandation en objet Course compatible avec CourseCard
    const coursesForCard: Course[] = recommendedItems.map(rec => ({
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
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                    <div className="h-6 w-1.5 bg-primary rounded-full" />
                    Recommandés pour vous
                </h2>
            </div>
            <Carousel opts={{ align: "start", loop: false }} className="w-full">
                <CarouselContent className="-ml-3">
                    {coursesForCard.map(course => (
                        <CarouselItem key={course.id} className="pl-3 basis-[48%] sm:basis-1/3 md:basis-1/4">
                            <CourseCard 
                                course={course} 
                                instructor={instructorsMap.get(course.instructorId) || null}
                                variant="grid" 
                            />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </section>
    );
}
