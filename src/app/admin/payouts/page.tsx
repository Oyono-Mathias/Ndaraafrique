
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Loader2, Check, X, Landmark, Wallet, FileDown } from 'lucide-react';
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


interface Payout {
  id: string;
  instructorId: string;
  instructorName: string;
  instructorAvatar: string;
  amount: number;
  method: 'Mobile Money' | 'Virement';
  status: 'en_attente' | 'valide' | 'rejete';
  date: Date;
  instructorBalance: number;
}

// --- MOCK DATA ---
const mockPayouts: Payout[] = [
  { id: '1', instructorId: 'instr1', instructorName: 'Amina Diallo', instructorAvatar: '/placeholder-avatars/amina.jpg', amount: 75000, method: 'Mobile Money', status: 'en_attente', date: new Date(2024, 6, 20), instructorBalance: 150000 },
  { id: '2', instructorId: 'instr2', instructorName: 'Kwame Nkrumah', instructorAvatar: '/placeholder-avatars/kwame.jpg', amount: 120000, method: 'Virement', status: 'en_attente', date: new Date(2024, 6, 19), instructorBalance: 110000 },
  { id: '3', instructorId: 'instr3', instructorName: 'Fatou Diop', instructorAvatar: '/placeholder-avatars/fatou.jpg', amount: 55000, method: 'Mobile Money', status: 'en_attente', date: new Date(2024, 6, 18), instructorBalance: 250000 },
  { id: '4', instructorId: 'instr4', instructorName: 'Jean Dupont', instructorAvatar: '/placeholder-avatars/jean.jpg', amount: 95000, method: 'Virement', status: 'valide', date: new Date(2024, 6, 15), instructorBalance: 0 },
  { id: '5', instructorId: 'instr5', instructorName: 'Marie Claire', instructorAvatar: '/placeholder-avatars/marie.jpg', amount: 60000, method: 'Mobile Money', status: 'rejete', date: new Date(2024, 6, 12), instructorBalance: 100000 },
];

const getStatusBadge = (status: Payout['status']) => {
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
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('en_attente');
  const [confirmationAction, setConfirmationAction] = useState<{payoutId: string, status: 'valide' | 'rejete'} | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate data fetching
  useEffect(() => {
    setTimeout(() => {
        setPayouts(mockPayouts);
        setIsLoading(false);
    }, 1500)
  }, []);
  
  const filteredPayouts = useMemo(() => {
    return payouts.filter(payout => payout.status === activeTab);
  }, [payouts, activeTab]);

  const handleUpdateStatus = async () => {
    if (!confirmationAction) return;
    const { payoutId, status } = confirmationAction;
    setUpdatingId(payoutId);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setPayouts(prev => prev.map(p => p.id === payoutId ? { ...p, status } : p));
    toast({ title: "Statut du retrait mis à jour" });
    
    setUpdatingId(null);
    setConfirmationAction(null);
  };
  
   const handleExport = () => {
    const dataToExport = filteredPayouts.map(p => ({
        Date: format(p.date, 'dd/MM/yyyy HH:mm'),
        Instructeur: p.instructorName,
        Montant: p.amount,
        Méthode: p.method,
        Statut: p.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Retraits");
    XLSX.writeFile(workbook, `NdaraAfrique_Retraits_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };
  
  const confirmationMessages = {
      valide: { title: "Confirmer l'approbation ?", description: "Cette action marquera le retrait comme payé et déplacera la transaction. Êtes-vous sûr ?" },
      rejete: { title: "Confirmer le rejet ?", description: "Cette action rejettera la demande de retrait de l'instructeur. Cette action est définitive."}
  }

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
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                    <TableHead className="dark:text-slate-400">Solde Instructeur</TableHead>
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
                              <AvatarImage src={payout.instructorAvatar} alt={payout.instructorName} />
                              <AvatarFallback>{payout.instructorName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium dark:text-slate-100">{payout.instructorName}</span>
                               <p className="text-xs text-muted-foreground">{formatDistanceToNow(payout.date, { addSuffix: true, locale: fr })}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono dark:text-slate-200">{formatCurrency(payout.amount)}</TableCell>
                        <TableCell className={cn("font-mono dark:text-slate-400", payout.instructorBalance < payout.amount ? 'text-destructive dark:text-destructive' : '')}>
                            {formatCurrency(payout.instructorBalance)}
                        </TableCell>
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
                            <p className="font-medium">Aucune demande de retrait</p>
                            <p className="text-sm">Il n'y a pas de demande de retrait {activeTab}.</p>
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
                                  <AvatarImage src={payout.instructorAvatar} alt={payout.instructorName} />
                                  <AvatarFallback>{payout.instructorName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                  <CardTitle className="text-base dark:text-white">{payout.instructorName}</CardTitle>
                                  <p className="text-xs text-muted-foreground dark:text-slate-400">{payout.method} • {formatDistanceToNow(payout.date, { addSuffix: true, locale: fr })}</p>
                              </div>
                          </CardHeader>
                          <CardContent className="text-center">
                              <p className="text-4xl font-extrabold tracking-tighter dark:text-white">{formatCurrency(payout.amount)}</p>
                              <p className={cn("text-xs font-mono", payout.instructorBalance < 0 ? "text-destructive" : "text-muted-foreground")}>
                                Solde: {formatCurrency(payout.instructorBalance)}
                              </p>
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
