
'use client';

import { useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, getFirestore, orderBy, limit } from 'firebase/firestore';
import type { CourseProgress, Course } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Play } from 'lucide-react';
import { Link } from 'next-intl';
import Image from 'next/image';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { CourseCard } from '../cards/CourseCard';

const ContinueLearningCard = ({ item }: { item: CourseProgress }) => {
    // Adapt CourseProgress to look like a Course for CourseCard
    const courseForCard: Course = {
        id: item.courseId,
        title: item.courseTitle,
        imageUrl: item.courseCover,
        progress: item.progressPercent,
        // Add dummy values for other required props
        description: '',
        category: '',
        price: 0,
        status: 'Published',
        instructorId: '' // No instructor info in CourseProgress, so pass empty/null
    };

    return <CourseCard course={courseForCard} instructor={null} variant="student" />;
};


export function ContinueLearning() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();

    const progressQuery = useMemo(
        () => currentUser?.uid
            ? query(
                collection(db, 'course_progress'),
                where('userId', '==', currentUser.uid),
                orderBy('updatedAt', 'desc'),
                limit(10) // Fetch more items to filter on the client
            )
            : null,
        [db, currentUser?.uid]
    );

    const { data: coursesInProgressRaw, isLoading: isProgressLoading } = useCollection<CourseProgress>(progressQuery);

    const coursesInProgress = useMemo(() => {
        if (!coursesInProgressRaw) return [];
        return coursesInProgressRaw.filter(course => course.progressPercent < 100).slice(0, 3);
    }, [coursesInProgressRaw]);

    const isLoading = isUserLoading || isProgressLoading;

    if (isLoading) {
        return (
             <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Reprendre l'apprentissage</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-2xl bg-slate-800" />)}
                </div>
            </section>
        );
    }
    
    if (!coursesInProgress || coursesInProgress.length === 0) {
        return null; // Don't show the section if there's nothing to continue
    }

    return (
        <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Reprendre l'apprentissage</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coursesInProgress.map(item => <ContinueLearningCard key={item.id} item={item} />)}
            </div>
        </section>
    );
}
