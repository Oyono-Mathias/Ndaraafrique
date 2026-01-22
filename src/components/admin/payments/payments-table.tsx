'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, orderBy, getDocs, where, documentId } from 'firebase/firestore';
import type { Payment, NdaraUser, Course } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Search, User, BookOpen, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { resolveSecurityItem } from '@/actions/securityActions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const getStatusVariant = (status: Payment['status']) => {
  switch (status) {
    case 'Completed': return 'success';
    case 'Pending': return 'secondary';
    case 'Failed': return 'destructive';
    case 'Refunded': return 'outline';
    default: return 'default';
  }
};

const PaymentRow = ({ payment, user, course }: { payment: Payment; user?: Partial<NdaraUser>; course?: Partial<Course> }) => {
    const { currentUser: adminUser } = useRole();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleResolveFraud = async () => {
        if (!adminUser || !payment.fraudReview?.isSuspicious) return;
        setIsLoading(true);
        const result = await resolveSecurityItem({
            itemId: payment.id,
            itemType: 'suspicious_payment',
            adminId: adminUser.uid,
        });
        if (result.success) {
            toast({ title: 'Alerte de fraude marquée comme résolue.' });
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
                        <AvatarImage src={user?.profilePictureURL} />
                        <AvatarFallback>{user?.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-white">{user?.fullName || 'Utilisateur inconnu'}</span>
                </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">{course?.title || 'Cours inconnu'}</TableCell>
            <TableCell className="font-medium">{payment.amount.toLocaleString('fr-FR')} {payment.currency}</TableCell>
            <TableCell className="hidden sm:table-cell">{payment.date ? format(payment.date.toDate(), 'd MMM yyyy, HH:mm', { locale: fr }) : ''}</TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(payment.status)}>{payment.status}</Badge>
                    {payment.fraudReview?.isSuspicious && !payment.fraudReview?.reviewed && (
                        <AlertTriangle className="h-4 w-4 text-amber-400" title="Paiement suspect"/>
                    )}
                </div>
            </TableCell>
            <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {payment.fraudReview?.isSuspicious && !payment.fraudReview?.reviewed && (
                            <DropdownMenuItem onClick={handleResolveFraud} disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />}
                                Marquer comme résolu
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem disabled>
                            <User className="mr-2 h-4 w-4" /> Voir l'utilisateur
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                            <BookOpen className="mr-2 h-4 w-4" /> Voir le cours
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
};

export function PaymentsTable() {
    const db = getFirestore();
    const [filter, setFilter] = useState<'all' | 'suspicious'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const paymentsQuery = useMemoFirebase(() => {
        let q = query(collection(db, 'payments'), orderBy('date', 'desc'));
        if (filter === 'suspicious') {
            q = query(q, where('fraudReview.isSuspicious', '==', true), where('fraudReview.reviewed', '!=', true));
        }
        return q;
    }, [db, filter]);
    
    const { data: payments, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery);

    const [usersMap, setUsersMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
    const [coursesMap, setCoursesMap] = useState<Map<string, Partial<Course>>>(new Map());
    const [relatedDataLoading, setRelatedDataLoading] = useState(true);

    useEffect(() => {
        if (paymentsLoading || !payments) return;
        
        const fetchRelatedData = async () => {
            setRelatedDataLoading(true);
            const userIds = [...new Set(payments.map(p => p.userId).filter(Boolean))];
            const courseIds = [...new Set(payments.map(p => p.courseId).filter(Boolean))];
            
            const newUsersMap = new Map(usersMap);
            const newCoursesMap = new Map(coursesMap);

            const userIdsToFetch = userIds.filter(id => !newUsersMap.has(id));
            const courseIdsToFetch = courseIds.filter(id => !newCoursesMap.has(id));

            if (userIdsToFetch.length > 0) {
                 const usersQuery = query(collection(db, 'users'), where('uid', 'in', userIdsToFetch.slice(0, 30)));
                 const snapshot = await getDocs(usersQuery);
                 snapshot.forEach(doc => newUsersMap.set(doc.id, { fullName: doc.data().fullName, profilePictureURL: doc.data().profilePictureURL }));
            }
             if (courseIdsToFetch.length > 0) {
                 const coursesQuery = query(collection(db, 'courses'), where(documentId(), 'in', courseIdsToFetch.slice(0, 30)));
                 const snapshot = await getDocs(coursesQuery);
                 snapshot.forEach(doc => newCoursesMap.set(doc.id, { title: doc.data().title }));
            }

            setUsersMap(newUsersMap);
            setCoursesMap(newCoursesMap);
            setRelatedDataLoading(false);
        };
        fetchRelatedData();

    }, [payments, paymentsLoading, db, usersMap, coursesMap]);

    const filteredPayments = useMemo(() => {
        if (!payments) return [];
        if (!searchTerm) return payments;
        return payments.filter(p => {
            const user = usersMap.get(p.userId);
            return user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [payments, searchTerm, usersMap]);

    const isLoading = paymentsLoading || relatedDataLoading;

    return (
        <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="space-y-4">
            <div className="flex justify-between items-center">
                 <TabsList>
                    <TabsTrigger value="all">Toutes les transactions</TabsTrigger>
                    <TabsTrigger value="suspicious">Alertes de Fraude</TabsTrigger>
                </TabsList>
                 <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par utilisateur..."
                        className="pl-10 dark:bg-slate-800"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <TabsContent value="all">
                <PaymentsGrid isLoading={isLoading} payments={filteredPayments} usersMap={usersMap} coursesMap={coursesMap} />
            </TabsContent>
             <TabsContent value="suspicious">
                <PaymentsGrid isLoading={isLoading} payments={filteredPayments} usersMap={usersMap} coursesMap={coursesMap} />
            </TabsContent>
        </Tabs>
    );
}

const PaymentsGrid = ({ isLoading, payments, usersMap, coursesMap }: any) => (
    <div className="border rounded-lg dark:border-slate-700">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead className="hidden md:table-cell">Cours</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full bg-slate-800"/></TableCell></TableRow>
                    ))
                ) : payments.length > 0 ? (
                    payments.map((p: Payment) => (
                        <PaymentRow key={p.id} payment={p} user={usersMap.get(p.userId)} course={coursesMap.get(p.courseId)} />
                    ))
                ) : (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucune transaction trouvée.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
    </div>
)
