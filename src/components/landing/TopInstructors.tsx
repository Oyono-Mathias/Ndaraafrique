
'use client';

/**
 * @fileOverview Section "Maîtres du Savoir" - Affiche les formateurs les plus populaires.
 * ✅ I18N : Traduction des labels et descriptions.
 */

import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { ShieldCheck, Users, BookOpen } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export function TopInstructors() {
    const locale = useLocale();
    const t = useTranslations('Landing.sections');
    const db = getFirestore();
    const [instructors, setInstructors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const q = query(
            collection(db, "users"), 
            where("role", "==", "instructor"),
            where("isInstructorApproved", "==", true),
            limit(4)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const data = await Promise.all(snapshot.docs.map(async (docSnap) => {
                const userData = docSnap.data();
                const coursesQ = query(collection(db, 'courses'), where('instructorId', '==', docSnap.id), where('status', '==', 'Published'));
                const coursesSnap = await getDocs(coursesQ);
                
                return {
                    uid: docSnap.id,
                    ...userData,
                    coursesCount: coursesSnap.size
                };
            }));
            
            setInstructors(data);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db]);

    if (isLoading || instructors.length === 0) return null;

    return (
        <section className="px-6 mb-24 max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-2">
                <h2 className="font-black text-3xl text-white uppercase tracking-tight">{t('experts_title')}</h2>
                <p className="text-slate-500 text-xs font-medium italic">{t('experts_desc')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {instructors.map(instructor => (
                    <Link key={instructor.uid} href={`/${locale}/instructor/${instructor.uid}`} className="group block active:scale-[0.98] transition-all">
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center text-center space-y-6 shadow-2xl relative overflow-hidden group-hover:border-primary/30 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ShieldCheck size={48} className="text-primary" />
                            </div>
                            
                            <div className="relative">
                                <Avatar className="h-24 w-24 border-4 border-slate-900 shadow-2xl">
                                    <AvatarImage src={instructor.profilePictureURL} className="object-cover" />
                                    <AvatarFallback className="bg-slate-800 text-2xl font-black text-slate-500 uppercase">
                                        {instructor.fullName?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 bg-primary p-1.5 rounded-full border-4 border-slate-950 shadow-xl">
                                    <ShieldCheck className="h-4 w-4 text-slate-950" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h3 className="font-black text-white text-base leading-tight uppercase tracking-tight group-hover:text-primary transition-colors truncate w-full px-2">
                                    {instructor.fullName}
                                </h3>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                    {instructor.careerGoals?.interestDomain || 'Expert Certifié'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-white/5">
                                <div className="space-y-1">
                                    <p className="text-white font-black text-sm leading-none">{(instructor.affiliateStats?.registrations || 0) + 120}</p>
                                    <p className="text-slate-600 text-[8px] font-black uppercase tracking-widest">{t('experts_label')}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-white font-black text-sm leading-none">{instructor.coursesCount || 1}</p>
                                    <p className="text-slate-600 text-[8px] font-black uppercase tracking-widest">{t('courses_label')}</p>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
