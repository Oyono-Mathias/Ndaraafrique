
'use client';

import { useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, getFirestore, orderBy, limit } from 'firebase/firestore';
import type { CourseProgress, Course } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard } from '../cards/CourseCard';
import { SectionHeader } from '../dashboard/SectionHeader';

export function ContinueLearning() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();

    const progressQuery = useMemo(
        () => currentUser?.uid
            ? query(
                collection(db, 'course_progress'),
                where('userId', '==', currentUser.uid),
                orderBy('updatedAt', 'desc'),
                limit(10)
            )
            : null,
        [db, currentUser?.uid]
    );

    const { data: recentProgress, isLoading: isProgressLoading } = useCollection<CourseProgress>(progressQuery);

    const coursesInProgress = useMemo(() => {
        if (!recentProgress) return [];
        return recentProgress.filter(p => p.progressPercent < 100).slice(0, 3);
    }, [recentProgress]);


    const isLoading = isUserLoading || isProgressLoading;

    if (isLoading) {
        return (
             <section>
                <SectionHeader title="Reprendre l'apprentissage" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-2xl bg-slate-800" />)}
                </div>
            </section>
        );
    }
    
    if (!coursesInProgress || coursesInProgress.length === 0) {
        return null;
    }
    
    const coursesForCard: (Course & { lastLessonId?: string })[] = coursesInProgress.map(item => ({
        id: item.courseId,
        title: item.courseTitle,
        imageUrl: item.courseCover,
        progress: item.progressPercent,
        lastLessonId: item.lastLessonId, // On passe l'ID de la leçon pour le lien direct
        description: '',
        category: '',
        price: 0,
        status: 'Published',
        instructorId: ''
    }));

    return (
        <section>
            <SectionHeader title="Reprendre l'apprentissage" />
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                {coursesForCard.map(course => (
                    <CourseCard
                        key={course.id}
                        course={course}
                        instructor={null}
                        variant="student"
                    />
                ))}
            </div>
        </section>
    );
}
