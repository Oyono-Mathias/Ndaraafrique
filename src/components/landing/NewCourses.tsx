
'use client';

/**
 * @fileOverview Section "Nouveaux Horizons" - Affiche les 6 cours les plus récents.
 * ✅ I18N : Traduction des titres et badges.
 */

import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Star, BookOpen } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { Course } from '@/lib/types';

export function NewCourses() {
    const locale = useLocale();
    const t = useTranslations('Landing.sections');
    const db = getFirestore();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const q = query(
            collection(db, "courses"), 
            where("status", "==", "Published"),
            orderBy("createdAt", "desc"),
            limit(6)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setCourses(data);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db]);

    if (isLoading || courses.length === 0) return null;

    return (
        <section className="px-6 mb-24 max-w-6xl mx-auto space-y-10">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <BookOpen size={20} />
                </div>
                <div className="space-y-1">
                    <h2 className="font-black text-2xl md:text-3xl text-white uppercase tracking-tight">{t('new_title')}</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('new_desc')}</p>
                </div>
            </div>

            <div className="flex overflow-x-auto gap-6 pb-8 hide-scrollbar snap-x">
                {courses.map(course => (
                    <Link key={course.id} href={`/${locale}/course/${course.id}`} className="min-w-[280px] bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden snap-center group active:scale-[0.98] transition-all shadow-2xl">
                        <div className="relative h-40 overflow-hidden bg-slate-800">
                            <Image src={course.imageUrl || ''} alt={course.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-black/20" />
                            <div className="absolute bottom-3 left-3 bg-blue-500/90 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black text-white uppercase tracking-widest shadow-lg">
                                {t('new_badge')}
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <h3 className="font-black text-white text-base leading-tight uppercase tracking-tight line-clamp-2 min-h-[2.5rem]">
                                {course.title}
                            </h3>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-yellow-500">
                                    <Star size={12} className="fill-current" />
                                    <span className="text-white text-[10px] font-black">{course.rating?.toFixed(1) || '---'}</span>
                                </div>
                                <span className="text-primary text-xs font-black uppercase tracking-tighter">
                                    {course.price === 0 ? "Offert" : `${course.price.toLocaleString('fr-FR')} F`}
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
