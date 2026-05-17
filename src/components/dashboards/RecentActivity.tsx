'use client';

/**
 * @fileOverview Liste des activités récentes (Design Qwen Clean).
 */

import { useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, getFirestore, orderBy, limit } from 'firebase/firestore';
import type { UserActivity } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Award, History, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function RecentActivity() {
    const { currentUser } = useRole();
    const db = getFirestore();

    const activityQuery = useMemo(
        () => currentUser?.uid
            ? query(
                collection(db, 'users', currentUser.uid, 'activity'),
                orderBy('createdAt', 'desc'),
                limit(5)
            )
            : null,
        [db, currentUser?.uid]
    );
    const { data: activities, isLoading } = useCollection<UserActivity>(activityQuery);

    if (isLoading) {
        return <div className="space-y-3 px-1">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-slate-900" />)}</div>;
    }

    if (!activities || activities.length === 0) return null;

    return (
        <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-1000">
            {activities.map(activity => (
                <div key={activity.id} className="glass-light rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.98]">
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner",
                        activity.type === 'certificate' ? "bg-amber-500/20 text-amber-500" : "bg-primary/20 text-primary"
                    )}>
                        {activity.type === 'certificate' ? <Award size={20} /> : <Check size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-black uppercase tracking-tight truncate">{activity.title}</p>
                        <p className="text-slate-500 text-[10px] font-medium italic truncate">"{activity.description}"</p>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600 text-[10px] font-black uppercase tracking-widest shrink-0">
                        <Clock size={10} />
                        {(activity.createdAt as any)?.toDate ? formatDistanceToNow((activity.createdAt as any).toDate(), { locale: fr }) : '...'}
                    </div>
                </div>
            ))}
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}