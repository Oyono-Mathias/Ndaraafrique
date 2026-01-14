

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  doc,
  updateDoc,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Check, X, Landmark, AlertTriangle, Wallet, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { NdaraUser } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';


interface Payout {
  id: string;
  instructorId: string;
  amount: number;
  method: string;
  status: 'en_attente' | 'valide' | 'rejete';
  date: any; // Firestore Timestamp
}

interface EnrichedPayout extends Payout {
    instructor?: Pick<NdaraUser, 'fullName' | 'email' | 'profilePictureURL'>;
    instructorBalance?: number;
}

const getStatusBadge = (status: Payout['status'], t: (key: string) => string) => {
  switch (status) {
    case 'en_attente':
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">{t('pending')}</Badge>;
    case 'valide':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">{t('approved')}</Badge>;
    case 'rejete':
      return <Badge variant="destructive">{t('rejected')}</Badge>;
    default:
      return <Badge variant="secondary">Inconnu</Badge>;
  }
};

const formatCurrency = (amount: number) => {
  return `${amount?.toLocaleString('fr-FR') || 0} XOF`;
};

export default function PayoutsPage() {
  const { t } = useTranslation();
  const { ndaraUser: adminUser, isUserLoading } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('en_attente');
  const [confirmationAction, setConfirmationAction] = useState<{payoutId: string, status: 'valide' | 'rejete'} | null>(null);
  
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [enrichedPayouts, setEnrichedPayouts] = useState<EnrichedPayout[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [settings, setSettings] = useState({ platformCommission: 30 });

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsub = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            setSettings({
                platformCommission: docSnap.data().commercial?.platformCommission || 30,
            });
        }
    });
    return () => unsub();
  }, [db]);


  useEffect(() => {
    const q = query(collection(db, 'payouts'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setPayouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payout)));
        setPayoutsLoading(false);
    });
    return () => unsubscribe();
  }, [db]);
  

  useEffect(() => {
    if (payoutsLoading || payouts.length === 0) {
        if(!payoutsLoading) setDataLoading(false);
        return;
    }

    const fetchDetails = async () => {
        setDataLoading(true);
        const instructorIds = [...new Set(payouts.map(p => p.instructorId))];
        if (instructorIds.length === 0) {
            setEnrichedPayouts([]);
            setDataLoading(false);
            return;
        }

        const usersMap = new Map<string, NdaraUser>();
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', 'in', instructorIds.slice(0,30)));
        const usersSnap = await getDocs(q);
        usersSnap.forEach(doc => usersMap.set(doc.id, doc.data() as NdaraUser));
        
        const instructorBalances = new Map<string, number>();

        for (const id of instructorIds) {
            const paymentsQuery = query(collection(db, 'payments'), where('instructorId', '==', id), where('status', '==', 'Completed'));
            const payoutsQuery = query(collection(db, 'payouts'), where('instructorId', '==', id), where('status', 'in', ['en_attente', 'valide']));
            
            const [paymentsSnap, payoutsSnap] = await Promise.all([getDocs(paymentsQuery), getDocs(payoutsQuery)]);
            
            const totalRevenue = paymentsSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
            const totalPayouts = payoutsSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
            
            const instructorShare = totalRevenue * (1 - settings.platformCommission / 100);
            instructorBalances.set(id, instructorShare - totalPayouts);
        }

        const enriched = payouts.map(payout => ({
            ...payout,
            instructor: usersMap.get(payout.instructorId),
            instructorBalance: instructorBalances.get(payout.instructorId) || 0
        }));

        setEnrichedPayouts(enriched);
        setDataLoading(false);
    }
    fetchDetails();
  }, [payouts, payoutsLoading, db, settings.platformCommission]);
  
  const filteredPayouts = useMemo(() => {
    return enrichedPayouts.filter(payout => payout.status === activeTab);
  }, [enrichedPayouts, activeTab]);

  const handleUpdateStatus = async () => {
    if (!confirmationAction) return;

    const { payoutId, status } = confirmationAction;
    setUpdatingId(payoutId);
    const payoutRef = doc(db, 'payouts', payoutId);
    try {
      await updateDoc(payoutRef, { status: status });
      toast({ title: t('payoutStatusUpdated'), description: t('payoutMarkedAs', { status: t(status) }) });
    } catch (error) {
      console.error("Error updating payout status:", error);
      toast({ variant: 'destructive', title: t('errorTitle'), description: t('payoutUpdateError') });
    } finally {
      setUpdatingId(null);
      setConfirmationAction(null);
    }
  };

  const handleExport = () => {
    const dataToExport = filteredPayouts.map(p => ({
        Date: p.date ? format(p.date.toDate(), 'dd/MM/yyyy HH:mm') : 'N/A',
        Instructeur: p.instructor?.fullName || 'Inconnu',
        Montant: p.amount,
        Méthode: p.method,
        Statut: t(p.status),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Retraits");
    XLSX.writeFile(workbook, `NdaraAfrique_Retraits_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const isLoading = isUserLoading || payoutsLoading || dataLoading;
  
  const confirmationMessages = {
      valide: { title: "Confirmer l'approbation ?", description: "Cette action marquera le retrait comme payé et déplacera la transaction. Êtes-vous sûr ?" },
      rejete: { title: "Confirmer le rejet ?", description: "Cette action rejettera la demande de retrait de l'instructeur. Cette action est définitive."}
  }

  return (
    <>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold dark:text-white">{t('payout_requests')}</h1>
          <p className="text-muted-foreground dark:text-slate-400">{t('payoutsManagementDescription')}</p>
        </header>

        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader>
              <div className="flex justify-between items-center">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList>
                          <TabsTrigger value="en_attente">{t('pending')}</TabsTrigger>
                          <TabsTrigger value="valide">{t('approved')}</TabsTrigger>
                          <TabsTrigger value="rejete">{t('rejected')}</TabsTrigger>
                      </TabsList>
                  </Tabs>
                  <Button variant="outline" onClick={handleExport} disabled={filteredPayouts.length === 0}>
                      <FileDown className="mr-2 h-4 w-4" />
                      {t('export')}
                  </Button>
              </div>
          </CardHeader>
          <CardContent>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                    <TableHead className="dark:text-slate-400">{t('instructor')}</TableHead>
                    <TableHead className="dark:text-slate-400">{t('amount')}</TableHead>
                    <TableHead className="dark:text-slate-400">Solde Instructeur</TableHead>
                    <TableHead className="dark:text-slate-400">{t('method')}</TableHead>
                    <TableHead className="text-right dark:text-slate-400">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i} className="dark:border-slate-700">
                        <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full dark:bg-slate-700" /><Skeleton className="h-4 w-32 dark:bg-slate-700" /></div></TableCell>
                        <TableCell><Skeleton className="h-5 w-24 dark:bg-slate-700" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24 dark:bg-slate-700" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 dark:bg-slate-700" /></TableCell>
                        <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-20 dark:bg-slate-700" /><Skeleton className="h-8 w-20 dark:bg-slate-700" /></div></TableCell>
                      </TableRow>
                    ))
                  ) : filteredPayouts.length > 0 ? (
                    filteredPayouts.map((payout) => (
                      <TableRow key={payout.id} className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={payout.instructor?.profilePictureURL} alt={payout.instructor?.fullName} />
                              <AvatarFallback>{payout.instructor?.fullName?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium dark:text-slate-100">{payout.instructor?.fullName}</span>
                               <p className="text-xs text-muted-foreground">{payout.date ? formatDistanceToNow(payout.date.toDate(), { addSuffix: true, locale: fr }) : 'N/A'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono dark:text-slate-200">{formatCurrency(payout.amount)}</TableCell>
                        <TableCell className={cn("font-mono dark:text-slate-400", (payout.instructorBalance ?? 0) < payout.amount ? 'text-destructive dark:text-destructive' : '')}>
                            {formatCurrency(payout.instructorBalance ?? 0)}
                        </TableCell>
                        <TableCell className="dark:text-slate-300">{payout.method}</TableCell>
                        <TableCell className="text-right">
                          {payout.status === 'en_attente' ? (
                              <div className="flex justify-end gap-2">
                                  <Button onClick={() => setConfirmationAction({payoutId: payout.id, status: 'rejete'})} size="sm" variant="destructive" disabled={!!updatingId}>
                                      <X className="mr-2 h-4 w-4"/>
                                      {t('reject')}
                                  </Button>
                                  <Button onClick={() => setConfirmationAction({payoutId: payout.id, status: 'valide'})} size="sm" variant="default" disabled={!!updatingId}>
                                      <Check className="mr-2 h-4 w-4"/>
                                      {t('approve_pay')}
                                  </Button>
                              </div>
                          ) : getStatusBadge(payout.status, t)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="dark:border-slate-700">
                      <TableCell colSpan={5} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                            <Wallet className="h-12 w-12" />
                            <p className="font-medium">{t('noPayoutRequests')}</p>
                            <p className="text-sm">{t('noPayoutsForStatus', { status: t(activeTab) })}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-4">
              {isLoading ? (
                  [...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full dark:bg-slate-700" />)
              ) : filteredPayouts.length > 0 ? (
                  filteredPayouts.map((payout) => (
                      <Card key={payout.id} className="dark:bg-slate-900/50 dark:border-slate-700">
                          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                            <Avatar>
                                  <AvatarImage src={payout.instructor?.profilePictureURL} alt={payout.instructor?.fullName} />
                                  <AvatarFallback>{payout.instructor?.fullName?.charAt(0) || 'U'}</AvatarFallback>
                              </Avatar>
                              <div>
                                  <CardTitle className="text-base dark:text-white">{payout.instructor?.fullName}</CardTitle>
                                  <p className="text-xs text-muted-foreground dark:text-slate-400">{payout.method} • {payout.date ? formatDistanceToNow(payout.date.toDate(), { addSuffix: true, locale: fr }) : 'N/A'}</p>
                              </div>
                          </CardHeader>
                          <CardContent className="text-center">
                              <p className="text-4xl font-extrabold tracking-tighter dark:text-white">{formatCurrency(payout.amount)}</p>
                              <p className={cn("text-xs font-mono", (payout.instructorBalance ?? 0) < 0 ? "text-destructive" : "text-muted-foreground")}>
                                Solde: {formatCurrency(payout.instructorBalance ?? 0)}
                              </p>
                          </CardContent>
                          {payout.status === 'en_attente' && (
                              <CardContent className="flex justify-between gap-2">
                                  <Button onClick={() => setConfirmationAction({payoutId: payout.id, status: 'rejete'})} variant="destructive" className="flex-1" disabled={!!updatingId}>
                                      <X className="mr-2 h-4 w-4"/>
                                      {t('reject')}
                                  </Button>
                                  <Button onClick={() => setConfirmationAction({payoutId: payout.id, status: 'valide'})} className="flex-1" disabled={!!updatingId}>
                                      <Check className="mr-2 h-4 w-4"/>
                                      {t('approve_pay')}
                                  </Button>
                              </CardContent>
                          )}
                          {payout.status !== 'en_attente' && (
                              <CardContent className="flex justify-center">
                                  {getStatusBadge(payout.status, t)}
                              </CardContent>
                          )}
                      </Card>
                  ))
              ) : (
                  <div className="h-48 text-center flex items-center justify-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                          <Wallet className="h-12 w-12" />
                          <p className="font-medium">{t('noPayoutRequests')}</p>
                      </div>
                  </div>
              )}
            </div>

          </CardContent>
        </Card>
      </div>

       <AlertDialog open={!!confirmationAction} onOpenChange={(open) => !open && setConfirmationAction(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>
                      {confirmationAction?.status === 'valide' ? confirmationMessages.valide.title : confirmationMessages.rejete.title}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                       {confirmationAction?.status === 'valide' ? confirmationMessages.valide.description : confirmationMessages.rejete.description}
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmationAction(null)}>{t('cancelButton')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUpdateStatus} disabled={!!updatingId} className={cn(confirmationAction?.status === 'rejete' && 'bg-destructive hover:bg-destructive/90')}>
                      {updatingId === confirmationAction?.payoutId ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                      {t('confirmButton')}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
