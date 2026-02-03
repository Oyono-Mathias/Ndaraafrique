'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, query, where, getFirestore, orderBy, limit, getDocs } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldOff, CreditCard, Ban, Check, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment, SecurityLog } from '@/lib/types';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserStatus } from '@/actions/userActions';
import { resolveSecurityItem } from '@/actions/securityActions';
import { Badge } from '@/components/ui/badge';

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
        case 'suspicious_payment': return <AlertTriangle className="h-5 w-5 text-amber-400" />;
        case 'failed_payment': return <CreditCard className="h-5 w-5 text-red-400" />;
        case 'suspicious_login': return <ShieldOff className="h-5 w-5 text-purple-400" />;
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
                 <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <AlertIcon type={item.type} />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{item.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                            {formatDistanceToNow(item.date, { addSuffix: true, locale: fr })}
                        </p>
                    </div>
                    <div className="flex self-end sm:self-center flex-shrink-0 gap-2 mt-3 sm:mt-0">
                        {item.userId && (
                             <Button variant="destructive" size="sm" onClick={handleSuspend} disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Ban className="h-3 w-3 sm:mr-1.5"/>}
                                <span className="hidden sm:inline">Suspendre</span>
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={handleResolve} disabled={isLoading}>
                             {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-3 w-3 sm:mr-1.5"/>}
                            <span className="hidden sm:inline">Résoudre</span>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function AdminSecurityAlerts() {
    const db = getFirestore();
    const { currentUser } = useRole();
    const [allAlerts, setAllAlerts] = useState<AlertItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (currentUser?.role !== 'admin') {
            setIsLoading(false);
            return;
        }

        const fetchAlerts = async () => {
            setIsLoading(true);
            try {
                const suspiciousPaymentsQuery = query(collection(db, 'payments'), where('fraudReview.isSuspicious', '==', true), where('fraudReview.reviewed', '!=', true), orderBy('fraudReview.reviewed'), orderBy('date', 'desc'), limit(5));
                const suspiciousLoginsQuery = query(collection(db, 'security_logs'), where('status', '==', 'open'), orderBy('timestamp', 'desc'), limit(5));

                const [suspiciousPaymentsSnap, suspiciousLoginsSnap] = await Promise.all([
                    getDocs(suspiciousPaymentsQuery),
                    getDocs(suspiciousLoginsQuery)
                ]);

                const alerts: AlertItem[] = [];

                suspiciousPaymentsSnap.docs.forEach(p => {
                    const data = p.data() as Payment;
                    alerts.push({
                        id: p.id,
                        type: 'suspicious_payment',
                        message: `Paiement suspect de ${data.amount.toLocaleString('fr-FR')} XOF. Score: ${data.fraudReview?.riskScore}.`,
                        // ✅ Sécurisation de la date Firestore
                        date: (data.date as any)?.toDate?.() || new Date(),
                        link: `/admin/payments?search=${p.id}`,
                        userId: data.userId
                    });
                });
                
                suspiciousLoginsSnap.docs.filter(l => l.data().eventType === 'suspicious_login').forEach(l => {
                    const data = l.data() as SecurityLog;
                    alerts.push({
                        id: l.id,
                        type: 'suspicious_login',
                        message: `Connexion suspecte détectée.`,
                        // ✅ Sécurisation de la date Firestore
                        date: (data.timestamp as any)?.toDate?.() || new Date(),
                        link: `/admin/users?search=${data.targetId}`,
                        userId: data.targetId,
                    });
                });

                setAllAlerts(alerts.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5));

            } catch (error) {
                console.error("Failed to fetch security alerts:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAlerts();
    }, [currentUser, db]);
    

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
