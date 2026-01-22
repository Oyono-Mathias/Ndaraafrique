
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, orderBy, getDocs, where, documentId } from 'firebase/firestore';
import type { Payout, NdaraUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, User, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { processPayout } from '@/actions/supportActions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from 'next-intl/navigation';

type PayoutStatus = 'en_attente' | 'valide' | 'rejete';

const getStatusVariant = (status: PayoutStatus) => {
  switch (status) {
    case 'en_attente': return 'warning';
    case 'valide': return 'success';
    case 'rejete': return 'destructive';
    default: return 'default';
  }
};

const PayoutRow = ({ payout, instructor }: { payout: Payout; instructor?: Partial<NdaraUser> }) => {
    const { currentUser: adminUser } = useRole();
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleProcessPayout = async (decision: 'valide' | 'rejete') => {
        if (!adminUser) return;
        setIsLoading(true);
        const result = await processPayout(payout.id, decision, adminUser.uid);
        if (result.success) {
            toast({ title: `Demande de retrait ${decision === 'valide' ? 'validée' : 'rejetée'}.` });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
        setIsLoading(false);
    };

    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={instructor?.profilePictureURL} />
                        <AvatarFallback>{instructor?.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-white">{instructor?.fullName || 'Instructeur inconnu'}</span>
                </div>
            </TableCell>
            <TableCell className="font-medium">{payout.amount.toLocaleString('fr-FR')} XOF</TableCell>
            <TableCell>{payout.method}</TableCell>
            <TableCell>{payout.date ? format(payout.date.toDate(), 'd MMM yyyy, HH:mm', { locale: fr }) : ''}</TableCell>
            <TableCell>
                <Badge variant={getStatusVariant(payout.status)} className="capitalize">
                    {payout.status.replace('_', ' ')}
                </Badge>
            </TableCell>
            <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
                             {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" />}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {payout.status === 'en_attente' && (
                            <>
                                <DropdownMenuItem onClick={() => handleProcessPayout('valide')} className="text-green-500 focus:text-green-500">
                                    <CheckCircle className="mr-2 h-4 w-4" /> Valider
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleProcessPayout('rejete')} className="text-destructive focus:text-destructive">
                                    <XCircle className="mr-2 h-4 w-4" /> Rejeter
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem onClick={() => router.push(`/instructor/${payout.instructorId}`)}>
                            <User className="mr-2 h-4 w-4" /> Voir l'instructeur
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
};

const PayoutsGrid = ({ isLoading, payouts, usersMap }: { isLoading: boolean, payouts: Payout[], usersMap: Map<string, Partial<NdaraUser>> }) => (
    <div className="border rounded-lg dark:border-slate-700">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Instructeur</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full bg-slate-800"/></TableCell></TableRow>
                    ))
                ) : payouts.length > 0 ? (
                    payouts.map((p: Payout) => (
                        <PayoutRow key={p.id} payout={p} instructor={usersMap.get(p.instructorId)} />
                    ))
                ) : (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucune demande de retrait trouvée.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
    </div>
);

export function PayoutsTable() {
    const db = getFirestore();
    const [filter, setFilter] = useState<PayoutStatus>('en_attente');

    const payoutsQuery = useMemoFirebase(() => {
        let q = query(collection(db, 'payouts'), where('status', '==', filter), orderBy('date', 'desc'));
        return q;
    }, [db, filter]);
    
    const { data: payouts, isLoading: payoutsLoading } = useCollection<Payout>(payoutsQuery);

    const [usersMap, setUsersMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
    const [usersLoading, setUsersLoading] = useState(true);

    useEffect(() => {
        if (payoutsLoading || !payouts) return;
        
        const fetchRelatedData = async () => {
            setUsersLoading(true);
            const userIds = [...new Set(payouts.map(p => p.instructorId).filter(Boolean))];
            
            const newUsersMap = new Map(usersMap);
            const idsToFetch = userIds.filter(id => !newUsersMap.has(id));

            if (idsToFetch.length > 0) {
                 const usersQuery = query(collection(db, 'users'), where('uid', 'in', idsToFetch.slice(0, 30)));
                 const snapshot = await getDocs(usersQuery);
                 snapshot.forEach(doc => {
                     const data = doc.data();
                     newUsersMap.set(data.uid, { fullName: data.fullName, profilePictureURL: data.profilePictureURL });
                 });
            }

            setUsersMap(newUsersMap);
            setUsersLoading(false);
        };
        fetchRelatedData();
    }, [payouts, payoutsLoading, db, usersMap]);
    
    const isLoading = payoutsLoading || usersLoading;

    return (
        <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="space-y-4">
            <TabsList>
                <TabsTrigger value="en_attente">En attente</TabsTrigger>
                <TabsTrigger value="valide">Validées</TabsTrigger>
                <TabsTrigger value="rejete">Rejetées</TabsTrigger>
            </TabsList>
            <TabsContent value="en_attente">
                <PayoutsGrid isLoading={isLoading} payouts={payouts || []} usersMap={usersMap} />
            </TabsContent>
            <TabsContent value="valide">
                <PayoutsGrid isLoading={isLoading} payouts={payouts || []} usersMap={usersMap} />
            </TabsContent>
            <TabsContent value="rejete">
                <PayoutsGrid isLoading={isLoading} payouts={payouts || []} usersMap={usersMap} />
            </TabsContent>
        </Tabs>
    );
}
