
'use client';

import { useMemo } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getFirestore, orderBy, limit, Timestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldOff, CreditCard, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment, SecurityLog } from '@/lib/types';
import { cn } from '@/lib/utils';

type AlertType = 'suspicious_payment' | 'failed_payment' | 'suspicious_login';

interface AlertItem {
  id: string;
  type: AlertType;
  message: string;
  date: Date;
  link: string;
}

const AlertIcon = ({ type }: { type: AlertType }) => {
    switch (type) {
        case 'suspicious_payment': return <AlertTriangle className="h-4 w-4 text-amber-400" />;
        case 'failed_payment': return <CreditCard className="h-4 w-4 text-red-400" />;
        case 'suspicious_login': return <ShieldOff className="h-4 w-4 text-purple-400" />;
    }
}

export function AdminSecurityAlerts() {
    const db = getFirestore();

    const suspiciousPaymentsQuery = useMemoFirebase(() => 
        query(collection(db, 'payments'), where('fraudReview.isSuspicious', '==', true), orderBy('date', 'desc'), limit(5)),
        [db]
    );
    const failedPaymentsQuery = useMemoFirebase(() => 
        query(collection(db, 'payments'), where('status', '==', 'Failed'), orderBy('date', 'desc'), limit(5)),
        [db]
    );
    const suspiciousLoginsQuery = useMemoFirebase(() => 
        query(collection(db, 'security_logs'), where('eventType', '==', 'suspicious_login'), orderBy('timestamp', 'desc'), limit(5)),
        [db]
    );

    const { data: suspiciousPayments, isLoading: loadingSuspicious } = useCollection<Payment>(suspiciousPaymentsQuery);
    const { data: failedPayments, isLoading: loadingFailed } = useCollection<Payment>(failedPaymentsQuery);
    const { data: suspiciousLogins, isLoading: loadingLogins } = useCollection<SecurityLog>(suspiciousLoginsQuery);
    
    const isLoading = loadingSuspicious || loadingFailed || loadingLogins;

    const allAlerts = useMemo(() => {
        const alerts: AlertItem[] = [];

        suspiciousPayments?.forEach(p => alerts.push({
            id: p.id,
            type: 'suspicious_payment',
            message: `Paiement suspect de ${p.amount.toLocaleString('fr-FR')} XOF. Score: ${p.fraudReview?.riskScore}.`,
            date: (p.date as Timestamp).toDate(),
            link: `/admin/payments?search=${p.id}`,
        }));

        failedPayments?.forEach(p => alerts.push({
            id: p.id,
            type: 'failed_payment',
            message: `Paiement échoué de ${p.amount.toLocaleString('fr-FR')} XOF.`,
            date: (p.date as Timestamp).toDate(),
            link: `/admin/payments?search=${p.id}`,
        }));
        
        suspiciousLogins?.forEach(l => alerts.push({
            id: l.id,
            type: 'suspicious_login',
            message: `Connexion suspecte détectée pour l'utilisateur ${l.userId.substring(0, 5)}...`,
            date: l.timestamp.toDate(),
            link: `/admin/users?search=${l.userId}`,
        }));

        return alerts.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

    }, [suspiciousPayments, failedPayments, suspiciousLogins]);

    if (isLoading) {
        return <Skeleton className="h-48 w-full bg-slate-800" />;
    }

    if (allAlerts.length === 0) {
        return (
            <Card className="dark:bg-green-900/30 dark:border-green-700/50">
                <CardContent className="p-6 text-center">
                    <ShieldCheck className="h-8 w-8 mx-auto text-green-400 mb-2" />
                    <p className="font-semibold text-green-300">Aucune alerte de sécurité</p>
                    <p className="text-sm text-slate-400">Le système est stable et aucune menace n'a été détectée.</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card className="dark:bg-amber-900/50 dark:border-amber-700/80">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-300">
                    <AlertTriangle/>
                    Alertes de Sécurité
                </CardTitle>
                <CardDescription className="text-amber-400/80">
                    Les événements suivants requièrent votre attention immédiate.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {allAlerts.map(alert => (
                        <Link href={alert.link} key={alert.id}>
                            <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-900/50 transition-colors">
                                <AlertIcon type={alert.type} />
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">{alert.message}</p>
                                    <p className="text-xs text-slate-400">
                                        {formatDistanceToNow(alert.date, { addSuffix: true, locale: fr })}
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-500" />
                            </div>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// Helper component for Icon mapping, can be expanded
const ShieldCheck = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
  </svg>
);
