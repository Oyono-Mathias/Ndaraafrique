'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { collection, query, where, getFirestore, getDocs, doc, onSnapshot, limit } from 'firebase/firestore';
import type { Course, NdaraUser, UserRecommendations } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Clock, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

export function RecommendedCourses() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const locale = useLocale();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // En attendant que le moteur de recommandation IA produise des données,
        // on affiche les derniers cours publiés.
        const q = query(
            collection(db, 'courses'),
            where('status', '==', 'Published'),
            limit(5)
        );

        const unsub = onSnapshot(q, (snap) => {
            setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
            setIsLoading(false);
        });

        return () => unsub();
    }, [db]);

    if (isLoading || isUserLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-6 w-1/3 bg-slate-900" />
                <div className="flex gap-4 overflow-hidden">
                    <Skeleton className="h-40 w-60 rounded-[2rem] bg-slate-900 shrink-0" />
                    <Skeleton className="h-40 w-60 rounded-[2rem] bg-slate-900 shrink-0" />
                </div>
            </div>
        );
    }

    if (courses.length === 0) return null;

    return (
        <section className="space-y-4">
            <h2 className="text-sm font-black text-white uppercase tracking-widest px-1">Recommandés pour vous</h2>
            
            <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar snap-x">
                {courses.map(course => (
                    <Link 
                        key={course.id} 
                        href={`/${locale}/course/${course.id}`}
                        className="min-w-[240px] bg-slate-900 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden snap-center group active:scale-[0.98] transition-all"
                    >
                        <div className="h-32 bg-slate-800 relative overflow-hidden">
                            <Image 
                                src={course.imageUrl || ''} 
                                alt={course.title} 
                                fill 
                                className="object-cover group-hover:scale-110 transition-transform duration-700" 
                            />
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black text-white border border-white/10 uppercase tracking-tighter">
                                {course.category}
                            </div>
                        </div>
                        <div className="p-4 space-y-2">
                            <h4 className="font-bold text-white text-sm line-clamp-2 leading-tight uppercase tracking-tight">
                                {course.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold mt-2">
                                <div className="flex items-center gap-1">
                                    <Star size={10} className="text-yellow-500 fill-yellow-500" />
                                    <span>{course.rating?.toFixed(1) || '4.8'}</span>
                                </div>
                                <span className="opacity-30">•</span>
                                <div className="flex items-center gap-1">
                                    <Clock size={10} />
                                    <span>12h</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
