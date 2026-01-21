'use client';

import { useState, useMemo } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
import type { NdaraUser } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle, Search, User, UserX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserStatus } from '@/actions/userActions';


const UserRow = ({ user }: { user: NdaraUser }) => {
    const { currentUser: adminUser } = useRole();
    const { toast } = useToast();

    const handleStatusUpdate = async (status: 'active' | 'suspended') => {
        if (!adminUser) return;
        const result = await updateUserStatus({ userId: user.uid, status, adminId: adminUser.uid });
        if (result.success) {
            toast({ title: 'Statut mis à jour' });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
    }

    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={user.profilePictureURL} />
                        <AvatarFallback>{user.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">{user.fullName}</div>
                </div>
            </TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
                <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'instructor' ? 'secondary' : 'default'}>{user.role}</Badge>
            </TableCell>
            <TableCell>
                 <Badge variant={user.status === 'active' ? 'success' : 'warning'}>{user.status}</Badge>
            </TableCell>
            <TableCell>{user.createdAt ? format(user.createdAt.toDate(), "d MMM yyyy", { locale: fr }) : 'N/A'}</TableCell>
            <TableCell>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Ouvrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>Voir le profil</DropdownMenuItem>
                        {user.status === 'active' ? (
                            <DropdownMenuItem onClick={() => handleStatusUpdate('suspended')} className="text-destructive">
                                <UserX className="mr-2 h-4 w-4" /> Suspendre
                            </DropdownMenuItem>
                        ) : (
                             <DropdownMenuItem onClick={() => handleStatusUpdate('active')} className="text-green-500">
                                <User className="mr-2 h-4 w-4" /> Réactiver
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    )
}

export function UsersTable() {
    const db = getFirestore();
    const usersQuery = useMemoFirebase(() => query(collection(db, 'users'), orderBy('createdAt', 'desc')), [db]);
    const { data: users, isLoading } = useCollection<NdaraUser>(usersQuery);

    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(user => 
            user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.username?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);
    
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Rechercher par nom, email..." 
                        className="pl-10 dark:bg-slate-800"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                 <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ajouter un utilisateur
                </Button>
            </div>
             <div className="border rounded-lg dark:border-slate-700">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rôle</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Date d'inscription</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={6}><Skeleton className="h-10 w-full bg-slate-800"/></TableCell>
                                </TableRow>
                            ))
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map(user => <UserRow key={user.uid} user={user} />)
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">Aucun utilisateur trouvé.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
