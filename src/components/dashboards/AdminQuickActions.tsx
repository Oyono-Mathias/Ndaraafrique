
'use client';

import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, where, getFirestore } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ShieldAlert, UserCheck, Landmark, Settings, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRole } from '@/context/RoleContext';


interface QuickActionCardProps {
    title: string;
    link: string;
    icon: React.ElementType;
    isLoading: boolean;
    alerts?: {
        label: string;
        count: number;
        variant?: 'default' | 'destructive' | 'secondary' | 'outline';
    }[];
}

const QuickActionCard = ({ title, link, icon: Icon, isLoading, alerts = [] }: QuickActionCardProps) => (
    <Link href={link} className="block group">
        <Card className="dark:bg-slate-800 dark:border-slate-700 h-full flex flex-col justify-between transition-all duration-200 hover:border-primary hover:-translate-y-1">
            <div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-bold text-white group-hover:text-primary transition-colors">{title}</CardTitle>
                    <Icon className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-24 bg-slate-700" />
                            <Skeleton className="h-5 w-20 bg-slate-700" />
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {alerts.length > 0 && alerts.some(a => a.count > 0) ? alerts.map((alert, index) => (
                                alert.count > 0 && (
                                    <div key={index} className="flex items-center gap-2 text-sm text-slate-300">
                                        <span className="font-semibold">{alert.label}:</span>
                                        <Badge variant={alert.variant || 'destructive'} className="text-xs">{alert.count}</Badge>
                                    </div>
                                )
                            )) : <p className="text-sm text-slate-400">Aucune action requise.</p>}
                        </div>
                    )}
                </CardContent>
            </div>
            <CardFooter className="pt-0">
                <Button variant="link" className="p-0 h-auto text-primary text-sm font-semibold">
                    Accéder
                    <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
            </CardFooter>
        </Card>
    </Link>
)


export function AdminQuickActions() {
    const db = getFirestore();
    const { currentUser } = useRole();

    const { data: pendingCourses, isLoading: loadingCourses } = useCollection(
        useMemoFirebase(() => currentUser?.role === 'admin' ? query(collection(db, 'courses'), where('status', '==', 'Pending Review')) : null, [db, currentUser])
    );
    const { data: pendingPayouts, isLoading: loadingPayouts } = useCollection(
        useMemoFirebase(() => currentUser?.role === 'admin' ? query(collection(db, 'payouts'), where('status', '==', 'en_attente')) : null, [db, currentUser])
    );
     const { data: pendingInstructors, isLoading: loadingInstructors } = useCollection(
        useMemoFirebase(() => currentUser?.role === 'admin' ? query(collection(db, 'users'), where('role', '==', 'instructor'), where('isInstructorApproved', '==', false)) : null, [db, currentUser])
    );
    const { data: suspendedUsers, isLoading: loadingSuspended } = useCollection(
        useMemoFirebase(() => currentUser?.role === 'admin' ? query(collection(db, 'users'), where('status', '==', 'suspended')) : null, [db, currentUser])
    );
    
    const isLoading = loadingCourses || loadingPayouts || loadingInstructors || loadingSuspended;

    const actions = [
        {
            title: "Gestion des utilisateurs",
            link: "/admin/users",
            icon: Users,
            isLoading: isLoading,
            alerts: [
                { label: 'Comptes suspendus', count: suspendedUsers?.length || 0, variant: 'destructive' }
            ]
        },
        {
            title: "Modération",
            link: "/admin/moderation",
            icon: ShieldAlert,
            isLoading: isLoading,
            alerts: [
                { label: 'Cours à valider', count: pendingCourses?.length || 0 },
                { label: 'Nouvelles candidatures', count: pendingInstructors?.length || 0, variant: 'secondary' }
            ]
        },
         {
            title: "Paiements & Retraits",
            link: "/admin/payouts",
            icon: Landmark,
            isLoading: isLoading,
            alerts: [
                 { label: 'Retraits en attente', count: pendingPayouts?.length || 0 }
            ]
        },
        {
            title: "Paramètres du Site",
            link: "/admin/settings",
            icon: Settings,
            isLoading: false,
            alerts: []
        }
    ];

    return (
         <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {actions.map(action => (
                <QuickActionCard key={action.title} {...action} />
            ))}
        </div>
    )
}
