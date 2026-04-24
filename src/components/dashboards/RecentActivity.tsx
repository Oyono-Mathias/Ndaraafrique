'use client';

import { useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, getFirestore, orderBy, limit } from 'firebase/firestore';
import type { UserActivity } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Award, BookOpen, Star, ClipboardCheck, History, CreditCard, AlertCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const ActivityIcon = ({ type, title }: { type: UserActivity['type'], title?: string }) => {
    switch (type) {
        case 'enrollment':
            return <BookOpen className="h-5 w-5 text-blue-500" />;
        case 'certificate':
            return <Award className="h-5 w-5 text-amber-500" />;
        case 'review':
            return <Star className="h-5 w-5 text-yellow-500" />;
        case 'assignment':
            return <ClipboardCheck className="h-5 w-5 text-green-500" />;
        case 'payment':
            if (title?.toLowerCase().includes('échouée')) return <AlertCircle className="h-5 w-5 text-red-500" />;
            return <CreditCard className="h-5 w-5 text-emerald-500" />;
        default:
            return <History className="h-5 w-5 text-slate-500" />;
    }
};

export function RecentActivity() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();

    const activityQuery = useMemo(
        () => currentUser?.uid
            ? query(
                collection(db, 'users', currentUser.uid, 'activity'),
                orderBy('createdAt', 'desc'),
                limit(10)
            )
            : null,
        [db, currentUser?.uid]
    );
    const { data: activities, isLoading: activityLoading } = useCollection<UserActivity>(activityQuery);

    const isLoading = isUserLoading || activityLoading;

    return (
        <Card className="dark:bg-slate-900/50 dark:border-white/5 shadow-2xl rounded-[2rem] overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Flux d'activités
                </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
                {isLoading ? (
                    <div className="space-y-4 p-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-2xl bg-slate-800 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-4/5 bg-slate-800" />
                                    <Skeleton className="h-3 w-1/4 bg-slate-800" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activities && activities.length > 0 ? (
                    <div className="space-y-1">
                        {activities.map(activity => (
                            <Link key={activity.id} href={activity.link || '#'} className="block p-4 rounded-3xl hover:bg-white/5 transition-all active:scale-[0.98] group">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center shrink-0 shadow-inner group-hover:bg-slate-700 transition-colors">
                                       <ActivityIcon type={activity.type} title={activity.title} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                         <p className="text-sm font-bold text-white uppercase tracking-tight truncate">{activity.title}</p>
                                         {activity.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 italic">{activity.description}</p>}
                                         <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-2 flex items-center gap-1">
                                             <Clock size={10} />
                                             {(activity.createdAt as any)?.toDate?.() 
                                                ? formatDistanceToNow((activity.createdAt as any).toDate(), { locale: fr, addSuffix: true }) 
                                                : 'À l\'instant'}
                                         </p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-slate-800 mt-3 group-hover:text-primary transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 opacity-30">
                        <History size={48} className="mx-auto mb-4 text-slate-700" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Aucun événement récent</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function Clock({ size, className }: any) {
    return <History size={size} className={className} />;
}
