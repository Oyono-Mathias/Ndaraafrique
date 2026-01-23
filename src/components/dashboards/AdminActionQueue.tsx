'use client';

import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemo } from 'react';
import { collection, query, where, getFirestore, Timestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, UserCheck, Landmark, HelpCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { Link } from 'next-intl/navigation';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRole } from '@/context/RoleContext';
import type { Course, NdaraUser, Payout, SupportTicket, Payment } from '@/lib/types';

interface ActionItem {
    id: string;
    type: 'course' | 'instructor' | 'payout' | 'ticket' | 'payment';
    title: string;
    description: string;
    date: Date;
    link: string;
    icon: React.ElementType;
}

const ActionItemCard = ({ item }: { item: ActionItem }) => (
    <Link href={item.link} className="block group">
        <Card className="dark:bg-slate-800/80 dark:border-slate-700 h-full flex flex-col justify-between transition-all duration-200 hover:border-primary hover:-translate-y-1">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-4 space-y-2 sm:space-y-0">
                <div className="p-3 bg-primary/10 rounded-full self-start">
                    <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                    <CardTitle className="text-base font-bold text-white group-hover:text-primary transition-colors">{item.title}</CardTitle>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors ml-auto hidden sm:block" />
            </CardHeader>
            <CardFooter>
                <p className="text-xs text-slate-500">
                    {formatDistanceToNow(item.date, { addSuffix: true, locale: fr })}
                </p>
            </CardFooter>
        </Card>
    </Link>
);

export function AdminActionQueue() {
    const db = getFirestore();
    const { currentUser } = useRole();

    // Corrected Queries
    const { data: pendingCourses, isLoading: loadingCourses } = useCollection<Course>(
        useMemo(() => currentUser?.role === 'admin' ? query(collection(db, 'courses'), where('status', '==', 'Pending Review')) : null, [db, currentUser])
    );

    const { data: pendingInstructors, isLoading: loadingInstructors } = useCollection<NdaraUser>(
        useMemo(() => currentUser?.role === 'admin' ? query(collection(db, 'users'), where('role', '==', 'instructor'), where('isInstructorApproved', '==', false)) : null, [db, currentUser])
    );

    const { data: pendingPayouts, isLoading: loadingPayouts } = useCollection<Payout>(
        useMemo(() => currentUser?.role === 'admin' ? query(collection(db, 'payouts'), where('status', '==', 'en_attente')) : null, [db, currentUser])
    );

    const { data: openTickets, isLoading: loadingTickets } = useCollection<SupportTicket>(
        useMemo(() => currentUser?.role === 'admin' ? query(collection(db, 'support_tickets'), where('status', '==', 'ouvert')) : null, [db, currentUser])
    );

    const { data: suspiciousPayments, isLoading: loadingPayments } = useCollection<Payment>(
        useMemo(() => currentUser?.role === 'admin' ? query(collection(db, 'payments'), where('fraudReview.isSuspicious', '==', true), where('fraudReview.reviewed', '!=', true)) : null, [db, currentUser])
    );

    const isLoading = loadingCourses || loadingInstructors || loadingPayouts || loadingTickets || loadingPayments;

    const allActions = useMemo(() => {
        const actions: ActionItem[] = [];

        pendingCourses?.forEach(item => actions.push({
            id: item.id, type: 'course', title: "Cours à modérer", description: item.title,
            date: item.createdAt?.toDate() || new Date(), link: '/admin/moderation', icon: ShieldAlert
        }));
        pendingInstructors?.forEach(item => actions.push({
            id: item.id, type: 'instructor', title: "Nouvel instructeur", description: item.fullName,
            date: item.createdAt?.toDate() || new Date(), link: '/admin/instructors', icon: UserCheck
        }));
        pendingPayouts?.forEach(item => actions.push({
            id: item.id, type: 'payout', title: "Demande de retrait", description: `${(item.amount || 0).toLocaleString('fr-FR')} XOF`,
            date: (item.date as unknown as Timestamp)?.toDate() || new Date(), link: '/admin/payouts', icon: Landmark
        }));
        openTickets?.forEach(item => actions.push({
            id: item.id, type: 'ticket', title: "Ticket de support", description: item.subject,
            date: item.createdAt?.toDate() || new Date(), link: `/admin/support/${item.id}`, icon: HelpCircle
        }));
        suspiciousPayments?.forEach(item => actions.push({
            id: item.id, type: 'payment', title: "Paiement suspect", description: `${(item.amount || 0).toLocaleString('fr-FR')} XOF`,
            date: (item.date as unknown as Timestamp)?.toDate() || new Date(), link: `/admin/payments`, icon: AlertTriangle
        }));

        return actions.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [pendingCourses, pendingInstructors, pendingPayouts, openTickets, suspiciousPayments]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 w-full bg-slate-800" />)}
            </div>
        );
    }

    if (allActions.length === 0) {
        return (
            <Card className="dark:bg-green-900/30 dark:border-green-700/50">
                <CardContent className="p-6 text-center">
                    <CardTitle className="text-lg font-semibold text-green-400">Tout est à jour !</CardTitle>
                    <CardDescription className="text-slate-400 mt-1">Aucune action prioritaire ne requiert votre attention.</CardDescription>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {allActions.map(action => (
                <ActionItemCard key={`${action.type}-${action.id}`} item={action} />
            ))}
        </div>
    );
}
