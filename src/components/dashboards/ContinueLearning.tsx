'use client';

/**
 * @fileOverview Composant "Reprendre l'étude" immersif pour le Dashboard Ndara.
 * ✅ DESIGN : Qwen Glassmorphism + Gradients animés.
 */

import { useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, getFirestore, orderBy, limit } from 'firebase/firestore';
import type { CourseProgress } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Play, ArrowRight } from 'lucide-react';
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

    if (isUserLoading || isProgressLoading) {
        return <Skeleton className="h-48 w-full rounded-4xl bg-slate-900" />;
    }
    
    if (!activeCourse || activeCourse.progressPercent === 100) return null;

    return (
        <Link href={`/${locale}/courses/${activeCourse.courseId}`} className="block group">
            <div className="glass rounded-[2rem] p-6 relative overflow-hidden shadow-2xl glow-green transition-all active:scale-[0.98] border border-white/5">
                {/* Gradient Background Layer */}
                <div className="absolute inset-0 gradient-bg opacity-[0.08] group-hover:opacity-[0.12] transition-opacity" />
                
                <div className="relative z-10">
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex-1 space-y-1">
                            <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-2">En cours d'étude</p>
                            <h2 className="text-2xl font-black text-white leading-tight uppercase tracking-tight line-clamp-1">{activeCourse.courseTitle}</h2>
                            <p className="text-slate-500 text-xs font-medium italic">"{activeCourse.lastLessonTitle || 'Introduction'}"</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
                            <Play className="w-5 h-5 text-slate-950 fill-current ml-0.5" />
                        </div>
                    </div>

                    {/* Progress Visual */}
                    <div className="mb-6 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-slate-500">Ma Progression</span>
                            <span className="text-primary">{activeCourse.progressPercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                            <div 
                                className="bg-gradient-to-r from-primary to-teal-400 h-full rounded-full shadow-[0_0_15px_#10b981] transition-all duration-1000" 
                                style={{ width: `${activeCourse.progressPercent}%` }}
                            />
                        </div>
                    </div>

                    <button className="w-full glass-light py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2 group-hover:gap-4">
                        <span>Continuer l'étude</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                </div>
            </div>
        </Link>
    );
}