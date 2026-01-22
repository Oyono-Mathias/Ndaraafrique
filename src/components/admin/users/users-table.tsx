
'use client';

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
import type { NdaraUser, UserRole } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  User as UserProfileIcon,
  Trash2,
  Loader2,
  MessageSquare,
  Gift,
  UserCog,
  Ban,
  UserCheck,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserStatus, deleteUserAccount, updateUserRole } from '@/actions/userActions';
import { useRouter } from 'next-intl/navigation';
import { startChat } from '@/lib/chat';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";



const UserRow = ({ user: targetUser }: { user: NdaraUser }) => {
    const { currentUser: adminUser, user: adminAuthUser } = useRole();
    const { toast } = useToast();
    const router = useRouter();
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRoleChanging, setIsRoleChanging] = useState(false);

    const handleStatusUpdate = async (status: 'active' | 'suspended') => {
        if (!adminUser) return;
        const result = await updateUserStatus({ userId: targetUser.uid, status, adminId: adminUser.uid });
        if (result.success) {
            toast({ title: 'Statut mis à jour' });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
    }

    const handleDeleteUser = async () => {
        if (!adminAuthUser) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Action non autorisée.' });
            return;
        }
        setIsDeleting(true);
        try {
            const idToken = await adminAuthUser.getIdToken(true);
            const result = await deleteUserAccount({ userId: targetUser.uid, idToken });
            if (result.success) {
                toast({ title: 'Utilisateur supprimé', description: 'Le compte a été supprimé avec succès.' });
                setIsAlertOpen(false);
            } else {
                toast({ variant: 'destructive', title: 'Erreur de suppression', description: result.error });
            }
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Erreur', description: e.message });
        } finally {
            setIsDeleting(false);
        }
    }
    
    const handleViewProfile = () => {
        if (targetUser.role === 'instructor') {
            router.push(`/instructor/${targetUser.uid}`);
        }
    };
    
    const handleContactUser = async () => {
        if (!adminUser) return;
        try {
            const chatId = await startChat(adminUser.uid, targetUser.uid);
            router.push(`/admin/messages?chatId=${chatId}`);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erreur de messagerie',
                description: error.message || "Impossible de démarrer la conversation.",
            });
        }
    };
    
    const handleOfferCourse = () => {
        toast({
            title: 'Fonctionnalité à venir',
            description: "La fonctionnalité pour offrir un cours sera bientôt disponible.",
        });
    };

    const handleRoleChange = async (newRole: UserRole) => {
        if (!adminUser || newRole === targetUser.role) return;
        setIsRoleChanging(true);
        const result = await updateUserRole({ userId: targetUser.uid, role: newRole, adminId: adminUser.uid });
        if (result.success) {
            toast({ title: 'Rôle mis à jour avec succès.' });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
        setIsRoleChanging(false);
    };

    const canInteract = adminUser?.uid !== targetUser.uid;
    const canDelete = canInteract && targetUser.role !== 'admin';
    const canChangeRole = canInteract && targetUser.role !== 'admin';

    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={targetUser.profilePictureURL} />
                        <AvatarFallback>{targetUser.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">{targetUser.fullName}</div>
                </div>
            </TableCell>
            <TableCell>{targetUser.email}</TableCell>
            <TableCell>
                <Badge variant={targetUser.role === 'admin' ? 'destructive' : targetUser.role === 'instructor' ? 'secondary' : 'default'}>{targetUser.role}</Badge>
            </TableCell>
            <TableCell>
                 <Badge variant={targetUser.status === 'active' ? 'success' : 'warning'}>{targetUser.status}</Badge>
            </TableCell>
            <TableCell>{targetUser.createdAt ? format(targetUser.createdAt.toDate(), "d MMM yyyy", { locale: fr }) : 'N/A'}</TableCell>
            <TableCell>
                <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Ouvrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={handleViewProfile} disabled={targetUser.role !== 'instructor'}>
                                <UserProfileIcon className="mr-2 h-4 w-4" />
                                Voir le profil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleContactUser} disabled={!canInteract}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Contacter
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleOfferCourse}>
                                <Gift className="mr-2 h-4 w-4" />
                                Offrir un cours
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                             <DropdownMenuSub>
                                <DropdownMenuSubTrigger disabled={!canChangeRole}>
                                    <UserCog className="mr-2 h-4 w-4" />
                                    <span>Changer le rôle</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => handleRoleChange('student')}>Étudiant</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleRoleChange('instructor')}>Instructeur</DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                            {targetUser.status === 'active' ? (
                                <DropdownMenuItem onClick={() => handleStatusUpdate('suspended')} className="text-amber-500 focus:bg-amber-500/10 focus:text-amber-500" disabled={!canInteract}>
                                    <Ban className="mr-2 h-4 w-4" /> Suspendre
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem onClick={() => handleStatusUpdate('active')} className="text-green-500 focus:bg-green-500/10 focus:text-green-500" disabled={!canInteract}>
                                    <UserCheck className="mr-2 h-4 w-4" /> Réactiver
                                </DropdownMenuItem>
                            )}
                            {canDelete && (
                                <>
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Supprimer
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action est irréversible et supprimera définitivement le compte de <b className="text-white">{targetUser.fullName}</b> ainsi que toutes ses données.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Oui, supprimer
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </TableCell>
        </TableRow>
    )
}

export function UsersTable() {
    const db = getFirestore();
    const usersQuery = useMemo(() => query(collection(db, 'users'), orderBy('createdAt', 'desc')), [db]);
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
