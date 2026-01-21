
'use client';

import { useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, where, getFirestore, orderBy, limit } from 'firebase/firestore';
import type { UserActivity } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Award, BookOpen, Star, ClipboardCheck, History } from 'lucide-react';
import { Link } from 'next-intl/navigation';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';


const ActivityIcon = ({ type }: { type: UserActivity['type'] }) => {
    switch (type) {
        case 'enrollment':
            return <BookOpen className="h-5 w-5 text-blue-500" />;
        case 'certificate':
            return <Award className="h-5 w-5 text-amber-500" />;
        case 'review':
            return <Star className="h-5 w-5 text-yellow-500" />;
        case 'assignment':
            return <ClipboardCheck className="h-5 w-5 text-green-500" />;
        default:
            return <History className="h-5 w-5 text-slate-500" />;
    }
};

export function RecentActivity() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();

    const activityQuery = useMemoFirebase(
        () => currentUser?.uid
            ? query(
                collection(db, 'users', currentUser.uid, 'activity'),
                orderBy('createdAt', 'desc'),
                limit(5)
            )
            : null,
        [db, currentUser?.uid]
    );
    const { data: activities, isLoading: activityLoading } = useCollection<UserActivity>(activityQuery);

    const isLoading = isUserLoading || activityLoading;

    return (
        <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <History className="h-5 w-5" />
                    Activité récente
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-8 w-8 rounded-full bg-slate-700" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-4/5 bg-slate-700" />
                                    <Skeleton className="h-3 w-1/4 bg-slate-700" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activities && activities.length > 0 ? (
                    <div className="space-y-2">
                        {activities.map(activity => (
                            <Link key={activity.id} href={activity.link || '#'} className="block p-3 rounded-lg hover:bg-slate-800 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="p-1 mt-1">
                                       <ActivityIcon type={activity.type} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-200">{activity.title}</p>
                                        {activity.description && <p className="text-xs text-slate-400">{activity.description}</p>}
                                        <p className="text-xs text-slate-500 mt-1">
                                            {activity.createdAt ? formatDistanceToNow(activity.createdAt.toDate(), { locale: fr, addSuffix: true }) : ''}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-slate-500">
                        <p>Aucune activité récente à afficher.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
