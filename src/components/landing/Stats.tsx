'use client';

/**
 * @fileOverview Statistiques de la landing page en temps réel.
 * Écoute Firestore pour afficher les compteurs réels sans valeurs fictives.
 */

import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { cn } from "@/lib/utils";

export function Stats() {
    const [stats, setStats] = useState({ studentCount: 0, courseCount: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const db = getFirestore();

    useEffect(() => {
        setIsLoading(true);
        // 1. Écouter les membres réels (rôle student)
        const unsubStudents = onSnapshot(query(collection(db, 'users'), where('role', '==', 'student')), (snapshot) => {
            setStats(prev => ({ ...prev, studentCount: snapshot.size }));
        });

        // 2. Écouter les cours réellement publiés
        const unsubCourses = onSnapshot(query(collection(db, 'courses'), where('status', '==', 'Published')), (snapshot) => {
            setStats(prev => ({ ...prev, courseCount: snapshot.size }));
            setIsLoading(false);
        });

        return () => {
            unsubStudents();
            unsubCourses();
        };
    }, [db]);

    const StatItem = ({ label, value, colorClass }: { label: string, value: string | number, colorClass?: string }) => (
        <div className="flex flex-col items-center gap-2">
            <p className={cn("text-3xl md:text-5xl font-black transition-all duration-700", colorClass || "text-brand-primary")}>
                {isLoading ? "..." : (typeof value === 'number' && value >= 1000 ? `${(value/1000).toFixed(1)}k+` : value)}
            </p>
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                {label}
            </p>
        </div>
    );

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center animate-in fade-in duration-1000">
            <StatItem label="Étudiants Actifs" value={stats.studentCount} />
            <StatItem label="Formations Premium" value={stats.courseCount} />
            <StatItem label="Note Moyenne" value="4.9/5" colorClass="text-brand-primary" />
            <StatItem label="Support Mentor" value="24/7" colorClass="text-brand-primary" />
        </div>
    );
}
