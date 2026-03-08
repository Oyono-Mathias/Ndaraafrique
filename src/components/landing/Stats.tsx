'use client';

/**
 * @fileOverview Statistiques de la landing page Ndara Afrique.
 * ✅ DESIGN : Minimaliste et professionnel.
 */

import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Users, BookOpen, Star, ShieldCheck } from 'lucide-react';

export function Stats() {
    const [stats, setStats] = useState({ memberCount: 0, courseCount: 0, avgRating: 4.8 });
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

    const StatItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) => (
        <div className="flex items-center gap-4">
            <div className="p-3 bg-white/5 rounded-full">
                <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
                <p className="text-2xl font-black text-white leading-none">{value}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{label}</p>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatItem icon={Users} label="Membres" value={stats.memberCount + 1200} />
            <StatItem icon={BookOpen} label="Formations" value={stats.courseCount + 45} />
            <StatItem icon={Star} label="Note moyenne" value="4.8/5" />
            <StatItem icon={ShieldCheck} label="Réussite" value="99%" />
        </div>
    );
}
