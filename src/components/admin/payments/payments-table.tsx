'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
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
            <TableCell className="hidden sm:table-cell">
                {payment.date && typeof (payment.date as any).toDate === 'function' 
                    ? format((payment.date as any).toDate(), 'd MMM yyyy, HH:mm', { locale: fr }) 
                    : ''}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(payment.status)}>{payment.status}</Badge>
                    {payment.fraudReview?.isSuspicious && !payment.fraudReview?.reviewed && (
                        <span title="Paiement suspect">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                        </span>
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