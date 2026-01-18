'use client';

import { useEffect, useState } from 'react';
import { getPublicStats } from '@/app/actions/statsActions';
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
                <Skeleton className="h-10 w-24 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
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
    const [stats, setStats] = useState<StatData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const result = await getPublicStats();
            if (result.success) {
                setStats(result.data);
            }
            setIsLoading(false);
        };
        fetchStats();
    }, []);

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
                    value={isLoading || !stats ? '...' : formatNumber(stats.studentCount)}
                    label="Étudiants"
                    icon={Users}
                    isLoading={isLoading}
                />
                <StatItem 
                    value={isLoading || !stats ? '...' : formatNumber(stats.instructorCount)}
                    label="Formateurs Experts"
                    icon={Briefcase}
                    isLoading={isLoading}
                />
            </div>
        </section>
    )
}