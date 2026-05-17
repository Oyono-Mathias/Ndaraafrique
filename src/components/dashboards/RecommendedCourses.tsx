'use client';

/**
 * @fileOverview Carrousel horizontal de recommandations (Design Qwen).
 */

import { useMemo, useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { collection, query, where, getFirestore, onSnapshot, limit } from 'firebase/firestore';
import type { Course } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export function RecommendedCourses() {
    const { currentUser } = useRole();
    const db = getFirestore();
    const locale = useLocale();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
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

    if (isLoading) {
        return (
            <div className="flex gap-4 overflow-hidden -mx-6 px-6">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="min-w-[180px] h-48 rounded-3xl bg-slate-900" />)}
            </div>
        );
    }

    if (courses.length === 0) return null;

    return (
        <div className="flex overflow-x-auto hide-scrollbar gap-4 -mx-6 px-6 pb-2 snap-x">
            {courses.map(course => (
                <Link 
                    key={course.id} 
                    href={`/${locale}/course/${course.id}`}
                    className="min-w-[200px] glass rounded-[2rem] p-4 transition-all active:scale-95 snap-center group"
                >
                    <div className="w-full h-28 rounded-2xl overflow-hidden mb-3 relative shadow-inner">
                        <Image 
                            src={course.imageUrl || ''} 
                            alt={course.title} 
                            fill 
                            className="object-cover group-hover:scale-110 transition-transform duration-700" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                    <h3 className="font-black text-white text-xs uppercase tracking-tight line-clamp-1 mb-2">
                        {course.title}
                    </h3>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-yellow-500">
                            <Star className="h-3 w-3 fill-current" />
                            <span className="text-white text-[10px] font-black">{course.rating?.toFixed(1) || '4.8'}</span>
                        </div>
                        <span className="text-primary font-black text-xs tracking-tighter">
                            {course.price === 0 ? "GRATUIT" : `${(course.price / 1000).toFixed(0)}K`}
                        </span>
                    </div>
                </Link>
            ))}
        </div>
    );
}