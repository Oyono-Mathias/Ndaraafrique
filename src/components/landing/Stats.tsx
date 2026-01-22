
'use client';

import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Users, Briefcase } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StatData {
  studentCount: number;
  instructorCount: number;
}

const StatItem = ({ value, label, icon: Icon, isLoading }: { value: string, label: string, icon: React.ElementType, isLoading: boolean }) => (
    <div className="text-center">
        {isLoading ? (
            <>
                <Skeleton className="h-10 w-24 mx-auto mb-2 bg-slate-700" />
                <Skeleton className="h-4 w-20 mx-auto bg-slate-700" />
            </>
        ) : (
            <>
                <p className="text-4xl font-extrabold text-white tracking-tighter">{value}</p>
                <p className="text-sm text-slate-400 font-medium flex items-center justify-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                </p>
            </>
        )}
    </div>
);

export function Stats() {
    const [stats, setStats] = useState<StatData>({ studentCount: 0, instructorCount: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const db = getFirestore();

    useEffect(() => {
        setIsLoading(true);

        const usersCollection = collection(db, 'users');
        
        const studentQuery = query(usersCollection, where('role', '==', 'student'));
        const instructorQuery = query(usersCollection, where('role', '==', 'instructor'));

        const unsubStudents = onSnapshot(studentQuery, (snapshot) => {
            setStats(prevStats => ({ ...prevStats, studentCount: snapshot.size }));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching student count:", error);
            setIsLoading(false);
        });

        const unsubInstructors = onSnapshot(instructorQuery, (snapshot) => {
            setStats(prevStats => ({ ...prevStats, instructorCount: snapshot.size }));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching instructor count:", error);
            setIsLoading(false);
        });

        return () => {
            unsubStudents();
            unsubInstructors();
        };
    }, [db]);

    const formatNumber = (num: number) => {
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1).replace('.', ',')}k+`;
        }
        return num.toString();
    }

    return (
        <section className="py-20 bg-slate-900/50 rounded-2xl border border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
                <StatItem 
                    value={isLoading ? '...' : formatNumber(stats.studentCount)}
                    label="Étudiants"
                    icon={Users}
                    isLoading={isLoading}
                />
                <StatItem 
                    value={isLoading ? '...' : formatNumber(stats.instructorCount)}
                    label="Formateurs Experts"
                    icon={Briefcase}
                    isLoading={isLoading}
                />
            </div>
        </section>
    )
}
