'use client';

/**
 * @fileOverview Section des formations populaires pour la Landing Page.
 * ✅ ANDROID-FIRST : Grille responsive 1 col mobile / 3+ desktop.
 * ✅ DYNAMIQUE : Récupère les cours "Published" triés par popularité.
 */

import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { CourseCard } from '@/components/cards/CourseCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { Course, NdaraUser } from '@/lib/types';

export function PopularCourses() {
    const db = getFirestore();
    const locale = useLocale();
    const [courses, setCourses] = useState<Course[]>([]);
    const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'courses'),
            where('status', '==', 'Published'),
            orderBy('participantsCount', 'desc'),
            limit(6)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setCourses(coursesData);
            
            if (coursesData.length > 0) {
                const instructorIds = [...new Set(coursesData.map(c => c.instructorId))];
                const instructorsRef = collection(db, 'users');
                const newMap = new Map();
                
                // Fetch par lots pour éviter les limites de Firestore
                for (let i = 0; i < instructorIds.length; i += 30) {
                    const chunk = instructorIds.slice(i, i + 30);
                    const qInst = query(instructorsRef, where('uid', 'in', chunk));
                    const snap = await getDocs(qInst);
                    snap.forEach(d => newMap.set(d.id, d.data()));
                }
                setInstructorsMap(newMap);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching popular courses:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db]);

    if (!isLoading && courses.length === 0) return null;

    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-12">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
                            <Sparkles size={14} className="animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sélection d'excellence</span>
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight leading-none">
                            Formations <br/>
                            <span className="gradient-text">les plus suivies</span>
                        </h2>
                    </div>
                    <Button asChild variant="ghost" className="text-primary hover:text-primary hover:bg-primary/5 font-black uppercase text-[10px] tracking-[0.2em] group">
                        <Link href={`/${locale}/search`}>
                            Voir tout le catalogue
                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </Button>
                </header>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="space-y-4">
                                <Skeleton className="aspect-video w-full rounded-[2rem] bg-slate-900 border border-slate-800" />
                                <Skeleton className="h-4 w-3/4 bg-slate-900" />
                                <Skeleton className="h-4 w-1/2 bg-slate-900" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10 animate-in fade-in duration-700">
                        {courses.map(course => (
                            <CourseCard 
                                key={course.id} 
                                course={course} 
                                instructor={instructorsMap.get(course.instructorId) || null}
                                variant="grid" 
                            />
                        ))}
                    </div>
                )}

                <div className="pt-8 text-center md:hidden">
                    <Button asChild className="w-full h-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 font-bold uppercase text-[10px] tracking-widest">
                        <Link href={`/${locale}/search`}>Parcourir tout le catalogue</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
