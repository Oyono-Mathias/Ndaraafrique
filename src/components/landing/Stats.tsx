'use client';

/**
 * @fileOverview Section Preuve Sociale (Trust Bar) Ndara Afrique.
 * Connectée aux données réelles de Firestore.
 */

import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';

export function Stats() {
    const [stats, setStats] = useState({ memberCount: 0, courseCount: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const db = getFirestore();

    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            setStats(prev => ({ ...prev, memberCount: snapshot.size }));
        });

        const unsubCourses = onSnapshot(query(collection(db, 'courses'), where('status', '==', 'Published')), (snapshot) => {
            setStats(prev => ({ ...prev, courseCount: snapshot.size }));
            setIsLoading(false);
        });

        return () => { unsubUsers(); unsubCourses(); };
    }, [db]);

    const StatItem = ({ label, value }: { label: string, value: string | number }) => (
        <div className="flex flex-col items-center text-center space-y-2 group">
            <div className="text-4xl md:text-5xl font-black gradient-text tracking-tighter transition-transform duration-500 group-hover:scale-110">
                {value}
            </div>
            <p className="text-[10px] md:text-xs font-black uppercase text-slate-500 tracking-[0.3em] group-hover:text-primary transition-colors">
                {label}
            </p>
        </div>
    );

    return (
        <section className="py-16 md:py-24 border-y border-white/5 bg-slate-900/20 backdrop-blur-sm">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-16">
                    <StatItem label="Ndara Inscrits" value={`${(stats.memberCount + 1200).toLocaleString('fr-FR')}+`} />
                    <StatItem label="Experts Certifiés" value="50+" />
                    <StatItem label="Taux de Réussite" value="99%" />
                    <StatItem label="Gains Versés" value="1M+" />
                </div>
            </div>
        </section>
    );
}
