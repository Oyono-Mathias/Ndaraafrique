'use client';

import { useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, getFirestore, orderBy, limit } from 'firebase/firestore';
import type { CourseProgress, Course } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { PlayCircle, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export function ContinueLearning() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const locale = useLocale();

    const progressQuery = useMemo(
        () => currentUser?.uid
            ? query(
                collection(db, 'course_progress'),
                where('userId', '==', currentUser.uid),
                orderBy('updatedAt', 'desc'),
                limit(1)
            )
            : null,
        [db, currentUser?.uid]
    );

    const { data: recentProgress, isLoading: isProgressLoading } = useCollection<CourseProgress>(progressQuery);

    const activeCourse = useMemo(() => {
        if (!recentProgress || recentProgress.length === 0) return null;
        return recentProgress[0];
    }, [recentProgress]);

    const isLoading = isUserLoading || isProgressLoading;

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-6 w-40 bg-slate-900" />
                <Skeleton className="h-48 w-full rounded-[2rem] bg-slate-900" />
            </div>
        );
    }
    
    if (!activeCourse || activeCourse.progressPercent === 100) return null;

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Continuer l'étude</h2>
                <Link href={`/${locale}/student/courses`} className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-white transition">
                    VOIR TOUT
                </Link>
            </div>

            <Link href={`/${locale}/courses/${activeCourse.courseId}`} className="block group active:scale-[0.98] transition-transform">
                <Card className="bg-slate-900 border-white/5 rounded-[2rem] overflow-hidden shadow-2xl relative min-h-[180px] flex flex-col justify-end">
                    {/* Background Immersive */}
                    <div className="absolute inset-0 z-0">
                        {activeCourse.courseCover && (
                            <Image 
                                src={activeCourse.courseCover} 
                                alt={activeCourse.courseTitle} 
                                fill 
                                className="object-cover opacity-30 group-hover:scale-105 transition-transform duration-700" 
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent" />
                    </div>

                    <CardContent className="p-6 relative z-10 space-y-4">
                        <div className="space-y-1">
                            <span className="inline-block px-2 py-0.5 rounded-lg bg-primary/20 border border-primary/30 text-primary text-[9px] font-black uppercase mb-2">
                                En progression
                            </span>
                            <h3 className="text-xl font-black text-white leading-tight uppercase tracking-tight drop-shadow-xl">
                                {activeCourse.courseTitle}
                            </h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                Dernière leçon : {activeCourse.lastLessonTitle || 'Introduction'}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="w-full bg-slate-800/80 backdrop-blur-sm rounded-full h-1.5 overflow-hidden border border-white/5">
                                <div 
                                    className="bg-primary h-full rounded-full shadow-[0_0_10px_hsl(var(--primary))] relative transition-all duration-1000" 
                                    style={{ width: `${activeCourse.progressPercent}%` }}
                                >
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-lg" />
                                </div>
                            </div>
                            <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                                <span>{activeCourse.progressPercent}% complété</span>
                                <span className="flex items-center gap-1 text-white">REPRENDRE <ChevronRight size={10} /></span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Link>
        </section>
    );
}
