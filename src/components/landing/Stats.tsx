
'use client';

import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Users, BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function Stats() {
    const [stats, setStats] = useState({ studentCount: 0, courseCount: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const db = getFirestore();

    useEffect(() => {
        setIsLoading(true);
        const usersCollection = collection(db, 'users');
        const coursesCollection = collection(db, 'courses');
        
        const studentQuery = query(usersCollection, where('role', '==', 'student'));
        const courseQuery = query(coursesCollection, where('status', '==', 'Published'));

        const unsubStudents = onSnapshot(studentQuery, (snapshot) => {
            setStats(prev => ({ ...prev, studentCount: snapshot.size }));
        });

        const unsubCourses = onSnapshot(courseQuery, (snapshot) => {
            setStats(prev => ({ ...prev, courseCount: snapshot.size }));
            setIsLoading(false);
        });

        return () => {
            unsubStudents();
            unsubCourses();
        };
    }, [db]);

    const StatItem = ({ label, value, icon: Icon }: any) => (
        <div className="flex-1 flex flex-col items-center p-4">
            <Icon className="h-5 w-5 text-primary mb-2 opacity-80" />
            <p className="text-2xl font-black text-white leading-none">
                {isLoading ? "..." : value >= 1000 ? `${(value/1000).toFixed(1)}k+` : value}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">{label}</p>
        </div>
    );

    return (
        <div className="flex items-center divide-x divide-slate-800 bg-slate-900/30 rounded-2xl border border-slate-800/50">
            <StatItem label="Étudiants" value={stats.studentCount} icon={Users} />
            <StatItem label="Formations" value={stats.courseCount} icon={BookOpen} />
        </div>
    );
}
