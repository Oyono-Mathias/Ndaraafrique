
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Check, X, Wallet, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getFirestore, orderBy, getDocs, where } from 'firebase/firestore';
import type { Payout as PayoutType, NdaraUser } from '@/lib/types';
import { processPayout } from '@/actions/supportActions';

interface EnrichedPayout extends PayoutType {
  instructor?: NdaraUser;
}

const getStatusBadge = (status: PayoutType['status']) => {
  switch (status) {
    case 'en_attente':
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">En attente</Badge>;
    case 'valide':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Approuvé</Badge>;
    case 'rejete':
      return <Badge variant="destructive">Rejeté</Badge>;
    default:
      return <Badge variant="secondary">Inconnu</Badge>;
  }
};

const formatCurrency = (amount: number) => {
  return `${amount?.toLocaleString('fr-FR') || 0} XOF`;
};

export default function PayoutsPage() {
  const { toast } = useToast();
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'en_attente' | 'valide' | 'rejete'>('en_attente');
  const [confirmationAction, setConfirmationAction] = useState<{payoutId: string, status: 'valide' | 'rejete'} | null>(null);
  
  const payoutsQuery = useMemoFirebase(() => query(collection(db, 'payouts'), orderBy('date', 'desc')), [db]);
  const { data: payouts, isLoading: payoutsLoading } = useCollection<PayoutType>(payoutsQuery);
  
  const [instructorsMap, setInstructorsMap] = useState<Map<string, NdaraUser>>(new Map());
  const [instructorsLoading, setInstructorsLoading] = useState(true);

  useEffect(() => {
    if (!payouts) return;
    const fetchInstructors = async () => {
        const instructorIds = [...new Set(payouts.map(p => p.instructorId))];
        const newIdsToFetch = instructorIds.filter(id => id && !instructorsMap.has(id));

        if (newIdsToFetch.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', newIdsToFetch.slice(0, 30)));
            const usersSnap = await getDocs(usersQuery);
            
            const newInstructors = new Map(instructorsMap);
            usersSnap.forEach(doc => newInstructors.set(doc.data().uid, doc.data() as NdaraUser));
            setInstructorsMap(newInstructors);
        }
        setInstructorsLoading(false);
    };
    fetchInstructors();
  }, [payouts, db, instructorsMap]);

  const enrichedPayouts = useMemo(() => {
    if (!payouts) return [];
    return payouts.map(p => ({
      ...p,
      instructor: instructorsMap.get(p.instructorId),
    }));
  }, [payouts, instructorsMap]);

  const filteredPayouts = useMemo(() => {
    return enrichedPayouts.filter(payout => payout.status === activeTab);
  }, [enrichedPayouts, activeTab]);

  const handleUpdateStatus = async () => {
    if (!confirmationAction || !currentUser) return;
    const { payoutId, status } = confirmationAction;
    setUpdatingId(payoutId);
    
    const result = await processPayout(payoutId, status, currentUser.uid);

    if (result.success) {
        toast({ title: "Statut du retrait mis à jour" });
    } else {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
    }
    
    setUpdatingId(null);
    setConfirmationAction(null);
  };
  
  const handleExport = () => {
    const dataToExport = filteredPayouts.map(p => ({
        'Date': p.date ? format(p.date.toDate(), 'dd/MM/yyyy HH:mm') : 'N/A',
        'Instructeur': p.instructor?.fullName || p.instructorId,
        'Montant': p.amount,
        'Méthode': p.method,
        'Statut': p.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Retraits");
    XLSX.writeFile(workbook, `NdaraAfrique_Retraits_${activeTab}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };
  
  const confirmationMessages = {
      valide: { title: "Confirmer l'approbation ?", description: "Cette action marquera le retrait comme payé et déplacera la transaction. Êtes-vous sûr ?" },
      rejete: { title: "Confirmer le rejet ?", description: "Cette action rejettera la demande de retrait de l'instructeur. Cette action est définitive."}
  };

  const isLoading = isUserLoading || payoutsLoading || (payouts && payouts.length > 0 && instructorsLoading);

  return (
    <>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold dark:text-white">Demandes de retrait</h1>
          <p className="text-muted-foreground dark:text-slate-400">Gérez les demandes de paiement des instructeurs.</p>
        </header>

        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader>
              <div className="flex justify-between items-center">
                  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'en_attente' | 'valide' | 'rejete')}>
                      <TabsList>
                          <TabsTrigger value="en_attente">En attente</TabsTrigger>
                          <TabsTrigger value="valide">Approuvés</TabsTrigger>
                          <TabsTrigger value="rejete">Rejetés</TabsTrigger>
                      </TabsList>
                  </Tabs>
                   <Button variant="outline" onClick={handleExport} disabled={filteredPayouts.length === 0}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Exporter
                  </Button>
              </div>
          </CardHeader>
          <CardContent>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                    <TableHead className="dark:text-slate-400">Instructeur</TableHead>
                    <TableHead className="dark:text-slate-400">Montant</TableHead>
                    <TableHead className="dark:text-slate-400">Méthode</TableHead>
                    <TableHead className="text-right dark:text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i} className="dark:border-slate-700">
                        <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full dark:bg-slate-700" /><Skeleton className="h-4 w-32 dark:bg-slate-700" /></div></TableCell>
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
                              <AvatarFallback>{payout.instructor?.fullName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium dark:text-slate-100">{payout.instructor?.fullName || payout.instructorId}</span>
                               <p className="text-xs text-muted-foreground">{payout.date ? formatDistanceToNow(payout.date.toDate(), { addSuffix: true, locale: fr }) : 'N/A'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono dark:text-slate-200">{formatCurrency(payout.amount)}</TableCell>
                        <TableCell className="dark:text-slate-300">{payout.method}</TableCell>
                        <TableCell className="text-right">
                          {payout.status === 'en_attente' ? (
                              <div className="flex justify-end gap-2">
                                  <Button onClick={() => setConfirmationAction({payoutId: payout.id, status: 'rejete'})} size="sm" variant="destructive" disabled={!!updatingId}>
                                      <X className="mr-2 h-4 w-4"/>
                                      Rejeter
                                  </Button>
                                  <Button onClick={() => setConfirmationAction({payoutId: payout.id, status: 'valide'})} size="sm" variant="default" disabled={!!updatingId}>
                                      <Check className="mr-2 h-4 w-4"/>
                                      Approuver
                                  </Button>
                              </div>
                          ) : getStatusBadge(payout.status)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="dark:border-slate-700">
                      <TableCell colSpan={5} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                            <Wallet className="h-12 w-12" />
                            <p className="font-medium">Aucune demande de retrait {activeTab}.</p>
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
                                  <AvatarFallback>{payout.instructor?.fullName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                  <CardTitle className="text-base dark:text-white">{payout.instructor?.fullName}</CardTitle>
                                  <p className="text-xs text-muted-foreground dark:text-slate-400">{payout.method} • {payout.date ? formatDistanceToNow(payout.date.toDate(), { addSuffix: true, locale: fr }) : 'N/A'}</p>
                              </div>
                          </CardHeader>
                          <CardContent className="text-center">
                              <p className="text-4xl font-extrabold tracking-tighter dark:text-white">{formatCurrency(payout.amount)}</p>
                          </CardContent>
                          {payout.status === 'en_attente' && (
                              <CardContent className="flex justify-between gap-2">
                                  <Button onClick={() => setConfirmationAction({payoutId: payout.id, status: 'rejete'})} variant="destructive" className="flex-1" disabled={!!updatingId}>
                                      <X className="mr-2 h-4 w-4"/>
                                      Rejeter
                                  </Button>
                                  <Button onClick={() => setConfirmationAction({payoutId: payout.id, status: 'valide'})} className="flex-1" disabled={!!updatingId}>
                                      <Check className="mr-2 h-4 w-4"/>
                                      Approuver
                                  </Button>
                              </CardContent>
                          )}
                           {payout.status !== 'en_attente' && (
                              <CardContent className="flex justify-center">
                                  {getStatusBadge(payout.status)}
                              </CardContent>
                          )}
                      </Card>
                  ))
              ) : (
                  <div className="h-48 text-center flex items-center justify-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                          <Wallet className="h-12 w-12" />
                          <p className="font-medium">Aucune demande de retrait</p>
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
                  <AlertDialogCancel onClick={() => setConfirmationAction(null)}>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUpdateStatus} disabled={!!updatingId} className={cn(confirmationAction?.status === 'rejete' && 'bg-destructive hover:bg-destructive/90')}>
                      {updatingId === confirmationAction?.payoutId ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                      Confirmer
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    