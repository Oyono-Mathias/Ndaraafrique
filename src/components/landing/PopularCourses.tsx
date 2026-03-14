'use client';

/**
 * @fileOverview Catalogue de Prestige - Formations d'Élite en Temps Réel.
 * ✅ DYNAMIQUE : Affiche les cours réels publiés depuis Firestore.
 * ✅ FALLBACK : Affiche des cours de prestige si le catalogue est vide.
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { Star, Users, ArrowRight, Loader2, BookOpen } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';

export function PopularCourses() {
    const locale = useLocale();
    const db = getFirestore();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [instructorsMap, setInstructorsMap] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        setIsLoading(true);
        // On récupère les 3 cours les plus populaires (basé sur le nombre de participants)
        const q = query(
            collection(db, "courses"), 
            where("status", "==", "Published"),
            orderBy("participantsCount", "desc"),
            limit(3)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setCourses(coursesData);
            
            if (coursesData.length > 0) {
                const instructorIds = [...new Set(coursesData.map(c => c.instructorId))];
                const newMap = new Map();
                for (const id of instructorIds) {
                    const uDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', id)));
                    if (!uDoc.empty) {
                        newMap.set(id, uDoc.docs[0].data().fullName);
                    }
                }
                setInstructorsMap(newMap);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db]);

    return (
        <section className="px-6 mb-20 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between px-1">
                <div className="space-y-1">
                    <h2 className="font-black text-2xl text-white uppercase tracking-tight">Le Savoir d'Élite</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Mises à jour en direct
                    </p>
                </div>
                <Link href={`/${locale}/search`}>
                    <button className="text-primary text-[10px] font-black uppercase tracking-[0.2em] hover:text-white transition">
                        VOIR TOUT
                    </button>
                </Link>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-[2.5rem] border border-white/5">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-4">Calcul des tendances Ndara...</p>
                </div>
            ) : courses.length > 0 ? (
                <div className="grid grid-cols-1 gap-8 animate-in fade-in duration-1000">
                    {courses.map((course) => (
                        <div key={course.id} className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl group active:scale-[0.98] transition-all duration-500">
                            <div className="relative h-48 overflow-hidden">
                                <Image 
                                    src={course.imageUrl || `https://picsum.photos/seed/${course.id}/800/400`} 
                                    alt={course.title} 
                                    fill 
                                    className="object-cover group-hover:scale-110 transition-transform duration-700" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-[9px] font-black text-white border border-white/10 uppercase tracking-widest">
                                    {course.category}
                                </div>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <h3 className="font-black text-lg text-white leading-tight uppercase tracking-tight line-clamp-2">
                                        {course.title}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        PAR {instructorsMap.get(course.instructorId) || 'EXPERT NDARA'}
                                    </p>
                                </div>
                                
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-1.5 text-yellow-500">
                                        <Star className="h-3.5 w-3.5 fill-current" />
                                        <span className="text-white text-xs font-black">{course.rating?.toFixed(1) || '4.8'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                        <Users className="h-3.5 w-3.5" />
                                        <span className="text-xs font-bold uppercase">{(course.participantsCount || 0).toLocaleString()} Ndara</span>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Accès Permanent</span>
                                        <span className="text-primary font-black text-xl tracking-tighter">
                                            {course.price === 0 ? "OFFERT" : `${course.price.toLocaleString('fr-FR')} XOF`}
                                        </span>
                                    </div>
                                    <Link href={`/${locale}/course/${course.id}`}>
                                        <div className="w-12 h-12 rounded-full bg-white text-slate-950 flex items-center justify-center hover:bg-primary transition-colors shadow-xl group-hover:rotate-[-45deg] duration-500">
                                            <ArrowRight className="h-5 w-5" />
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[2.5rem] opacity-20">
                    <BookOpen className="h-16 w-16 mx-auto mb-4" />
                    <p className="font-black uppercase tracking-widest text-xs">Le catalogue est en cours de création</p>
                </div>
            )}
        </section>
    );
}
