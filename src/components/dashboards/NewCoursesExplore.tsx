'use client';

import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { CourseCard } from '../cards/CourseCard';
import { SectionHeader } from '../dashboard/SectionHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Course } from '@/lib/types';

export function NewCoursesExplore() {
    const db = getFirestore();
    const [newCourses, setNewCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'courses'),
            where('status', '==', 'Published'),
            orderBy('createdAt', 'desc'),
            limit(4)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setNewCourses(courses);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching new courses:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db]);

    if (isLoading) {
        return (
            <section className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-4 overflow-x-hidden">
                    {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}
                </div>
            </section>
        );
    }

    if (newCourses.length === 0) return null;

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <SectionHeader title="Dernières pépites" />
                <Button variant="ghost" size="sm" asChild className="text-primary font-black uppercase text-[10px]">
                    <Link href="/search">
                        Voir tout <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {newCourses.map(course => (
                    <CourseCard 
                        key={course.id} 
                        course={course} 
                        instructor={null} 
                        variant="grid" 
                    />
                ))}
            </div>
        </section>
    );
}
