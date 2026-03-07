'use client';

import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { CourseCard } from '../cards/CourseCard';
import { SectionHeader } from '../dashboard/SectionHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { Course } from '@/lib/types';

/**
 * @fileOverview Composant de découverte des nouveaux cours pour le Dashboard Étudiant.
 */
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
                    <Skeleton className="h-40 w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
                    <Skeleton className="h-40 w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
                </div>
            </section>
        );
    }

    if (newCourses.length === 0) return null;

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                    <div className="h-6 w-1.5 bg-primary rounded-full" />
                    Découvrir le catalogue
                </h2>
                <Button variant="ghost" size="sm" asChild className="text-primary font-black uppercase text-[10px] tracking-widest hover:bg-primary/5">
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
