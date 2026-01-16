
'use client';

import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getFirestore } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ShieldAlert, UserCheck, Landmark, HelpCircle, UserX, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

interface ActionCardProps {
    title: string;
    count: number;
    link: string;
    icon: React.ElementType;
    isLoading: boolean;
}

const ActionCard = ({ title, count, link, icon: Icon, isLoading }: ActionCardProps) => {
    return (
        <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
                <Icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
                {isLoading ? (
                     <Skeleton className="h-7 w-12 bg-slate-700" />
                ) : (
                    <div className="text-2xl font-bold text-white">{count}</div>
                )}
            </CardContent>
            <CardFooter className="pt-0">
                 <Button asChild variant="link" className="p-0 h-auto text-primary">
                    <Link href={link}>
                        Traiter
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
};

export function AdminActionQueue() {
    const { t } = useTranslation();
    const db = getFirestore();

    const { data: pendingCourses, isLoading: loadingCourses } = useCollection(
        useMemoFirebase(() => query(collection(db, 'courses'), where('status', '==', 'Pending Review')), [db])
    );
    const { data: pendingPayouts, isLoading: loadingPayouts } = useCollection(
        useMemoFirebase(() => query(collection(db, 'payouts'), where('status', '==', 'en_attente')), [db])
    );
     const { data: openTickets, isLoading: loadingTickets } = useCollection(
        useMemoFirebase(() => query(collection(db, 'support_tickets'), where('status', '==', 'ouvert')), [db])
    );
     const { data: pendingInstructors, isLoading: loadingInstructors } = useCollection(
        useMemoFirebase(() => query(collection(db, 'users'), where('role', '==', 'instructor'), where('isInstructorApproved', '==', false)), [db])
    );
    const { data: suspendedUsers, isLoading: loadingSuspended } = useCollection(
        useMemoFirebase(() => query(collection(db, 'users'), where('status', '==', 'suspended')), [db])
    );

    const isLoading = loadingCourses || loadingPayouts || loadingTickets || loadingInstructors || loadingSuspended;

    const actions = [
        {
            title: "Candidatures Formateur",
            count: pendingInstructors?.length || 0,
            link: "/admin/instructors",
            icon: UserCheck,
            isLoading: isLoading
        },
        {
            title: "Cours en attente",
            count: pendingCourses?.length || 0,
            link: "/admin/moderation",
            icon: ShieldAlert,
            isLoading: isLoading
        },
        {
            title: "Demandes de retrait",
            count: pendingPayouts?.length || 0,
            link: "/admin/payouts",
            icon: Landmark,
            isLoading: isLoading
        },
        {
            title: "Tickets ouverts",
            count: openTickets?.length || 0,
            link: "/admin/support",
            icon: HelpCircle,
            isLoading: isLoading
        },
         {
            title: "Comptes suspendus",
            count: suspendedUsers?.length || 0,
            link: "/admin/users",
            icon: UserX,
            isLoading: isLoading
        }
    ];
    
    const highPriorityActions = actions.filter(a => a.count > 0);

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                 {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-36 w-full bg-slate-800" />)}
            </div>
        )
    }

    if (highPriorityActions.length === 0) {
        return (
             <Card className="dark:bg-green-900/30 dark:border-green-700/50">
                <CardHeader className="items-center text-center">
                    <CardTitle className="text-lg font-semibold text-green-400">Tout est à jour !</CardTitle>
                    <CardDescription className="text-slate-400">Aucune action prioritaire ne requiert votre attention.</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {highPriorityActions.map(action => (
                <ActionCard key={action.title} {...action} />
            ))}
        </div>
    );
}
