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
                <Skeleton className="h-6 w-48 rounded-full" />
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                </div>
            </section>
        );
    }

    if (newCourses.length === 0) return null;

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <SectionHeader title="Nouveautés" />
                <Button variant="ghost" size="sm" asChild className="text-primary font-black uppercase text-[10px]">
                    <Link href="/search">
                        Voir tout <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-x-3 gap-y-6">
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
