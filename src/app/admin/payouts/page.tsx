
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  doc,
  updateDoc,
  where,
  getDocs,
} from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Check, X, Landmark, AlertTriangle, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

interface Payout {
  id: string;
  instructorId: string;
  amount: number;
  method: string;
  status: 'en_attente' | 'valide' | 'rejete';
  date: any; // Firestore Timestamp
}

interface EnrichedPayout extends Payout {
    instructor?: Pick<FormaAfriqueUser, 'fullName' | 'email' | 'profilePictureURL'>;
}

const getStatusBadge = (status: Payout['status']) => {
  switch (status) {
    case 'en_attente':
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">En attente</Badge>;
    case 'valide':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Validé</Badge>;
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
  const { formaAfriqueUser: adminUser, isUserLoading } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('en_attente');
  
  const payoutsQuery = useMemoFirebase(
    () => query(collection(db, 'payouts'), orderBy('date', 'desc')),
    [db]
  );
  const { data: payouts, isLoading: payoutsLoading } = useCollection<Payout>(payoutsQuery);
  
  const [enrichedPayouts, setEnrichedPayouts] = useState<EnrichedPayout[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    if (!payouts) return;

    const fetchInstructors = async () => {
        setUsersLoading(true);
        const instructorIds = [...new Set(payouts.map(p => p.instructorId))];
        if (instructorIds.length === 0) {
            setEnrichedPayouts([]);
            setUsersLoading(false);
            return;
        }

        const usersMap = new Map<string, FormaAfriqueUser>();
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', 'in', instructorIds.slice(0,30)));
        const usersSnap = await getDocs(q);
        usersSnap.forEach(doc => usersMap.set(doc.id, doc.data() as FormaAfriqueUser));
        
        const enriched = payouts.map(payout => ({
            ...payout,
            instructor: usersMap.get(payout.instructorId)
        }));

        setEnrichedPayouts(enriched);
        setUsersLoading(false);
    }
    fetchInstructors();
  }, [payouts]);
  
  const filteredPayouts = useMemo(() => {
    return enrichedPayouts.filter(payout => payout.status === activeTab);
  }, [enrichedPayouts, activeTab]);

  const handleUpdateStatus = async (payoutId: string, status: 'valide' | 'rejete') => {
    setUpdatingId(payoutId);
    const payoutRef = doc(db, 'payouts', payoutId);
    try {
      await updateDoc(payoutRef, { status: status });
      toast({ title: 'Statut mis à jour', description: `La demande de retrait a été marquée comme ${status}.` });
    } catch (error) {
      console.error("Error updating payout status:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour le statut.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const isLoading = isUserLoading || payoutsLoading || usersLoading;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Demandes de Retrait</h1>
        <p className="text-muted-foreground dark:text-slate-400">Gérez les demandes de paiement des instructeurs.</p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
             <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="en_attente">En attente</TabsTrigger>
                    <TabsTrigger value="valide">Validées</TabsTrigger>
                    <TabsTrigger value="rejete">Rejetées</TabsTrigger>
                </TabsList>
            </Tabs>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                  <TableHead className="dark:text-slate-400">Instructeur</TableHead>
                  <TableHead className="hidden md:table-cell dark:text-slate-400">Montant</TableHead>
                  <TableHead className="hidden lg:table-cell dark:text-slate-400">Date</TableHead>
                   <TableHead className="hidden lg:table-cell dark:text-slate-400">Méthode</TableHead>
                  <TableHead className="text-right dark:text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="dark:border-slate-700">
                      <TableCell><Skeleton className="h-10 w-40 dark:bg-slate-700" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 dark:bg-slate-700" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-28 dark:bg-slate-700" /></TableCell>
                       <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-20 dark:bg-slate-700" /></TableCell>
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
                            <p className="text-xs text-muted-foreground dark:text-slate-400 md:hidden">{formatCurrency(payout.amount)}</p>
                          </div>
                        </div>
                      </TableCell>
                       <TableCell className="hidden md:table-cell font-mono dark:text-slate-200">{formatCurrency(payout.amount)}</TableCell>
                       <TableCell className="text-muted-foreground hidden lg:table-cell dark:text-slate-400">
                          {payout.date ? formatDistanceToNow(payout.date.toDate(), { addSuffix: true, locale: fr }) : 'N/A'}
                      </TableCell>
                       <TableCell className="hidden lg:table-cell dark:text-slate-300">{payout.method}</TableCell>
                      <TableCell className="text-right">
                         {payout.status === 'en_attente' ? (
                             <div className="flex justify-end gap-2">
                                <Button onClick={() => handleUpdateStatus(payout.id, 'rejete')} size="sm" variant="destructive" disabled={updatingId === payout.id}>
                                    {updatingId === payout.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="mr-2 h-4 w-4"/>}
                                    Rejeter
                                </Button>
                                <Button onClick={() => handleUpdateStatus(payout.id, 'valide')} size="sm" variant="default" disabled={updatingId === payout.id}>
                                    {updatingId === payout.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4"/>}
                                    Valider
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
                          <p className="text-sm">Il n'y a aucune demande de retrait avec le statut "{activeTab}".</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
