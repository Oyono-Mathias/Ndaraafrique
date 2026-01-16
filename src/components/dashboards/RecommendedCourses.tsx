'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { collection, query, where, getFirestore, limit, getDocs } from 'firebase/firestore';
import type { Course, NdaraUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard } from '@/components/cards/CourseCard';
import { Sparkles, Edit } from 'lucide-react';
import { Button } from '../ui/button';

export function RecommendedCourses() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
    const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isUserLoading || !currentUser) {
            if (!isUserLoading) setIsLoading(false);
            return;
        }

        if (!currentUser.careerGoals?.interestDomain) {
            setIsLoading(false);
            return;
        }

        const fetchRecommendations = async () => {
            setIsLoading(true);

            try {
                // 1. Get user's enrolled courses
                const enrollmentsQuery = query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid));
                const enrollmentsSnap = await getDocs(enrollmentsQuery);
                const enrolledCourseIds = new Set(enrollmentsSnap.docs.map(doc => doc.data().courseId));

                // 2. Query for courses matching user's interest
                const recommendationsQuery = query(
                    collection(db, 'courses'),
                    where('status', '==', 'Published'),
                    where('category', '==', currentUser.careerGoals.interestDomain),
                    limit(10) // Fetch a bit more to have a buffer after filtering
                );
                
                const coursesSnap = await getDocs(recommendationsQuery);
                
                const potentialCourses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

                // 3. Filter out already enrolled courses client-side
                const finalRecommendations = potentialCourses.filter(course => !enrolledCourseIds.has(course.id)).slice(0, 4);

                setRecommendedCourses(finalRecommendations);

                // 4. Fetch instructor details for the recommended courses
                if (finalRecommendations.length > 0) {
                    const instructorIds = [...new Set(finalRecommendations.map(c => c.instructorId).filter(Boolean))];
                    if (instructorIds.length > 0) {
                        const usersQuery = query(collection(db, 'users'), where('uid', 'in', instructorIds));
                        const userSnapshots = await getDocs(usersQuery);
                        const newInstructors = new Map<string, Partial<NdaraUser>>();
                        userSnapshots.forEach(doc => {
                            const userData = doc.data();
                            newInstructors.set(userData.uid, { fullName: userData.fullName });
                        });
                        setInstructorsMap(newInstructors);
                    }
                }

            } catch (error) {
                console.error("Error fetching recommended courses:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecommendations();

    }, [currentUser, isUserLoading, db]);

    if (isUserLoading) {
        return (
             <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Recommandés pour vous</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-2xl bg-slate-800" />)}
                </div>
            </section>
        )
    }

    // Prompt to complete profile if interestDomain is missing
    if (!currentUser?.careerGoals?.interestDomain) {
        return (
            <section>
                <div className="text-center p-8 bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-2xl">
                    <Sparkles className="mx-auto h-12 w-12 text-primary/80 mb-4" />
                    <h3 className="font-bold text-lg text-white">Débloquez vos recommandations personnelles !</h3>
                    <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">Complétez votre profil en ajoutant votre domaine d'intérêt pour recevoir des suggestions de cours sur mesure.</p>
                    <Button asChild className="mt-6">
                        <Link href="/account">
                            <Edit className="h-4 w-4 mr-2" />
                            Compléter mon profil
                        </Link>
                    </Button>
                </div>
            </section>
        );
    }
    
    if (isLoading) {
         return (
             <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Recommandés pour vous</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-2xl bg-slate-800" />)}
                </div>
            </section>
        )
    }

    if (recommendedCourses.length === 0) {
        return null; // Don't show the section if there are no recommendations
    }

    return (
        <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Recommandés pour vous</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendedCourses.map(course => (
                     <CourseCard 
                        key={course.id}
                        course={course} 
                        instructor={instructorsMap.get(course.instructorId) || null}
                        variant="catalogue" 
                    />
                ))}
            </div>
        </section>
    );
}
