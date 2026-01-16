
'use client';

import { useMemo, useState } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getFirestore, orderBy, limit, Timestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldOff, CreditCard, User, ArrowRight, Ban, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment, SecurityLog } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserStatus } from '@/app/actions/userActions';
import { resolveSecurityItem } from '@/app/actions/securityActions';

type AlertType = 'suspicious_payment' | 'failed_payment' | 'suspicious_login';

interface AlertItem {
  id: string;
  type: AlertType;
  message: string;
  date: Date;
  link: string;
  userId?: string;
}

const AlertIcon = ({ type }: { type: AlertType }) => {
    switch (type) {
        case 'suspicious_payment': return <AlertTriangle className="h-4 w-4 text-amber-400" />;
        case 'failed_payment': return <CreditCard className="h-4 w-4 text-red-400" />;
        case 'suspicious_login': return <ShieldOff className="h-4 w-4 text-purple-400" />;
    }
}

const AlertCard = ({ item }: { item: AlertItem }) => {
    const { currentUser } = useRole();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleResolve = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentUser) return;
        setIsLoading(true);
        const result = await resolveSecurityItem({ itemId: item.id, itemType: item.type, adminId: currentUser.uid });
        if (result.success) {
            toast({ title: "Alerte marquée comme résolue." });
        } else {
            toast({ variant: 'destructive', title: "Erreur", description: result.error });
        }
        setIsLoading(false);
    }
    
    const handleSuspend = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!item.userId || !currentUser) {
            toast({ variant: 'destructive', title: "Erreur", description: "ID utilisateur manquant pour cette action." });
            return;
        }
        setIsLoading(true);
        const result = await updateUserStatus({ userId: item.userId, status: 'suspended', adminId: currentUser.uid });
        if (result.success) {
            toast({ title: "Utilisateur suspendu", description: "Le compte de l'utilisateur a été suspendu." });
        } else {
             toast({ variant: 'destructive', title: "Erreur", description: result.error });
        }
        setIsLoading(false);
    }

    return (
        <Card className="dark:bg-slate-800/60 dark:border-slate-700">
            <CardContent className="p-4">
                <div className="flex items-start gap-4">
                    <AlertIcon type={item.type} />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{item.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                            {formatDistanceToNow(item.date, { addSuffix: true, locale: fr })}
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                    {item.userId && (
                         <Button variant="destructive" size="sm" onClick={handleSuspend} disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Ban className="h-3 w-3 mr-1.5"/>}
                            Suspendre
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleResolve} disabled={isLoading}>
                         {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-3 w-3 mr-1.5"/>}
                        Résoudre
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export function AdminSecurityAlerts() {
    const db = getFirestore();

    const suspiciousPaymentsQuery = useMemoFirebase(() => 
        query(collection(db, 'payments'), where('fraudReview.isSuspicious', '==', true), where('fraudReview.reviewed', '!=', true), orderBy('fraudReview.reviewed'), orderBy('date', 'desc'), limit(5)),
        [db]
    );
     const suspiciousLoginsQuery = useMemoFirebase(() => 
        query(collection(db, 'security_logs'), where('status', '==', 'open'), orderBy('timestamp', 'desc'), limit(5)),
        [db]
    );

    const { data: suspiciousPayments, isLoading: loadingSuspicious } = useCollection<Payment>(suspiciousPaymentsQuery);
    const { data: suspiciousLogins, isLoading: loadingLogins } = useCollection<SecurityLog>(suspiciousLoginsQuery);
    
    const isLoading = loadingSuspicious || loadingLogins;

    const allAlerts = useMemo(() => {
        const alerts: AlertItem[] = [];

        suspiciousPayments?.forEach(p => alerts.push({
            id: p.id,
            type: 'suspicious_payment',
            message: `Paiement suspect de ${p.amount.toLocaleString('fr-FR')} XOF. Score: ${p.fraudReview?.riskScore}.`,
            date: (p.date as Timestamp).toDate(),
            link: `/admin/payments?search=${p.id}`,
            userId: p.userId
        }));
        
        suspiciousLogins?.filter(l => l.eventType === 'suspicious_login').forEach(l => alerts.push({
            id: l.id,
            type: 'suspicious_login',
            message: `Connexion suspecte détectée.`,
            date: l.timestamp.toDate(),
            link: `/admin/users?search=${l.targetId}`,
            userId: l.targetId,
        }));

        return alerts.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

    }, [suspiciousPayments, suspiciousLogins]);

    if (isLoading) {
        return (
             <Card className="dark:bg-amber-900/50 dark:border-amber-700/80">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-300"><AlertTriangle/>Alertes de Sécurité</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-20 w-full bg-slate-700/50" />
                    <Skeleton className="h-20 w-full bg-slate-700/50" />
                </CardContent>
             </Card>
        );
    }
    
    return (
        <Card className="dark:bg-amber-900/50 dark:border-amber-700/80">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-300">
                    <AlertTriangle/>
                    Alertes de Sécurité {allAlerts.length > 0 && <Badge variant="destructive" className="h-5">{allAlerts.length}</Badge>}
                </CardTitle>
                <CardDescription className="text-amber-400/80">
                    Les événements suivants requièrent votre attention immédiate.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {allAlerts.length > 0 ? (
                        allAlerts.map(alert => <AlertCard key={alert.id} item={alert} />)
                    ) : (
                        <p className="text-sm text-center py-4 text-slate-300">Aucune alerte active pour le moment.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
