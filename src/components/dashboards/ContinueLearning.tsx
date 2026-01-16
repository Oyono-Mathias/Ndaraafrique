
'use client';

import { useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getFirestore, orderBy, limit } from 'firebase/firestore';
import type { CourseProgress } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

const ContinueLearningCard = ({ item }: { item: CourseProgress }) => {
    const progress = item.progressPercent || 0;
    const progressColorClass = cn({
        "bg-red-500": progress < 40,
        "bg-amber-500": progress >= 40 && progress < 80,
        "bg-green-500": progress >= 80,
    });

    return (
        <div className="w-full h-full glassmorphism-card rounded-2xl overflow-hidden group flex flex-col">
            <Link href={`/courses/${item.courseId}`} className="block">
                <div className="relative aspect-video overflow-hidden bg-slate-800">
                    <Image
                        src={item.courseCover || `https://picsum.photos/seed/${item.courseId}/400/225`}
                        alt={item.courseTitle}
                        fill
                        className="object-cover transition-all duration-300 group-hover:scale-105"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
            </Link>
            <div className="p-4 flex flex-col flex-grow">
                <Link href={`/courses/${item.courseId}`} className="block">
                    <h3 className="font-bold text-base text-slate-100 line-clamp-2 h-12 group-hover:text-primary transition-colors">{item.courseTitle}</h3>
                </Link>
                <div className="flex-grow" />
                <div className="mt-4 space-y-2">
                     <div>
                        {progress > 0 && (
                            <p className="text-xs text-center text-slate-400 mb-1">
                                Plus que {100 - progress}% pour obtenir votre certificat !
                            </p>
                        )}
                        <Progress value={progress} className="h-1.5" indicatorClassName={progressColorClass} />
                    </div>
                    <Button size="sm" className="w-full font-bold bg-primary hover:bg-primary/90" asChild>
                        <Link href={`/courses/${item.courseId}`}>
                            <Play className="h-4 w-4 mr-2"/>
                            Continuer
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
};


export function ContinueLearning() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();

    const progressQuery = useMemoFirebase(
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
