
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, getDocs, where, documentId } from 'firebase/firestore';
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
  DropdownMenuPortal,
  DropdownMenuSubContent,
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
  Users,
  Clock,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserStatus, deleteUserAccount, updateUserRole } from '@/actions/userActions';
import { useRouter } from 'next/navigation';
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
import { GrantCourseModal } from './GrantCourseModal';
import { UserDetailsModal } from './UserDetailsModal';

const UserRow = ({ 
    user: targetUser, 
    onGrantRequest, 
    onViewProfile 
}: { 
    user: NdaraUser & { id: string }, 
    onGrantRequest: (user: NdaraUser) => void,
    onViewProfile: (user: NdaraUser) => void
}) => {
    const { currentUser: adminUser, user: adminAuthUser } = useRole();
    const { toast } = useToast();
    const router = useRouter();
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const handleStatusUpdate = async (status: 'active' | 'suspended') => {
        if (!adminUser || isActionLoading) return;
        setIsActionLoading(true);
        const result = await updateUserStatus({ userId: targetUser.uid || targetUser.id, status, adminId: adminUser.uid });
        if (result.success) {
            toast({ title: 'Statut mis à jour' });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
        setIsActionLoading(false);
    }

    const handleDeleteUser = async () => {
        if (!adminAuthUser) return;
        setIsDeleting(true);
        try {
            const idToken = await adminAuthUser.getIdToken(true);
            const result = await deleteUserAccount({ userId: targetUser.uid || targetUser.id, idToken });
            if (result.success) {
                toast({ title: 'Utilisateur supprimé' });
                setIsAlertOpen(false);
            } else {
                toast({ variant: 'destructive', title: 'Erreur', description: result.error });
            }
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Erreur', description: e.message });
        } finally {
            setIsDeleting(false);
        }
    }
    
    const handleContactUser = async () => {
        if (!adminUser || isActionLoading) return;
        setIsActionLoading(true);
        try {
            const chatId = await startChat(adminUser.uid, targetUser.uid || targetUser.id);
            router.push(`/admin/messages?chatId=${chatId}`);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de démarrer la discussion." });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleRoleChange = async (newRole: UserRole) => {
        if (!adminUser || newRole === targetUser.role || isActionLoading) return;
        setIsActionLoading(true);
        const result = await updateUserRole({ userId: targetUser.uid || targetUser.id, role: newRole, adminId: adminUser.uid });
        if (result.success) {
            toast({ title: 'Rôle mis à jour' });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
        setIsActionLoading(false);
    };

    const createdAt = (targetUser.createdAt as any)?.toDate?.() || null;

    return (
        <TableRow className="group border-slate-800 hover:bg-slate-800/20">
            <TableCell>
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-slate-800 shadow-lg">
                        <AvatarImage src={targetUser.profilePictureURL} className="object-cover" />
                        <AvatarFallback className="bg-slate-800 text-slate-500 font-bold">{targetUser.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm text-white">{targetUser.fullName || 'Nouvel Utilisateur'}</span>
                        <span className="text-[10px] text-slate-500 font-medium">@{targetUser.username || targetUser.id.substring(0, 8)}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-xs text-slate-400 font-medium">{targetUser.email || 'N/A'}</TableCell>
            <TableCell>
                <Badge variant={targetUser.role === 'admin' ? 'destructive' : targetUser.role === 'instructor' ? 'secondary' : 'default'} className="font-black text-[9px] uppercase tracking-widest border-none px-2 py-0">
                    {targetUser.role || 'student'}
                </Badge>
            </TableCell>
            <TableCell>
                 <Badge variant={targetUser.status === 'active' ? 'success' : 'warning'} className="font-black text-[9px] uppercase tracking-widest border-none px-2 py-0">
                    {targetUser.status || 'active'}
                 </Badge>
            </TableCell>
            <TableCell className="text-[10px] font-black text-slate-500 uppercase">
                {createdAt ? format(createdAt, "d MMM yyyy", { locale: fr }) : 'En attente'}
            </TableCell>
            <TableCell className="text-right">
                <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all active:scale-90" disabled={isActionLoading}>
                                {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" />}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-300">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-800" />
                                
                                <DropdownMenuItem onClick={() => onViewProfile(targetUser)} className="cursor-pointer gap-2 py-2.5">
                                    <UserProfileIcon className="h-4 w-4 text-primary" />
                                    <span className="font-bold text-xs uppercase tracking-tight">Voir le profil</span>
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem onClick={handleContactUser} className="cursor-pointer gap-2 py-2.5">
                                    <MessageSquare className="h-4 w-4 text-blue-400" />
                                    <span className="font-bold text-xs uppercase tracking-tight">Messagerie</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => onGrantRequest(targetUser)} className="cursor-pointer gap-2 py-2.5 text-primary">
                                    <Gift className="h-4 w-4" />
                                    <span className="font-bold text-xs uppercase tracking-tight">Offrir cours</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-slate-800" />
                                
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger className="cursor-pointer gap-2 py-2.5">
                                        <UserCog className="h-4 w-4 text-amber-400" />
                                        <span className="font-bold text-xs uppercase tracking-tight">Changer rôle</span>
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent className="bg-slate-900 border-slate-800 text-slate-300">
                                            <DropdownMenuItem onClick={() => handleRoleChange('student')} className="cursor-pointer font-bold text-xs uppercase">Étudiant</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleRoleChange('instructor')} className="cursor-pointer font-bold text-xs uppercase">Instructeur</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleRoleChange('admin')} className="cursor-pointer font-bold text-xs uppercase text-red-400">Admin</DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>

                                {targetUser.status === 'active' ? (
                                    <DropdownMenuItem onClick={() => handleStatusUpdate('suspended')} className="cursor-pointer gap-2 py-2.5 text-amber-500">
                                        <Ban className="h-4 w-4" />
                                        <span className="font-bold text-xs uppercase tracking-tight">Suspendre</span>
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => handleStatusUpdate('active')} className="cursor-pointer gap-2 py-2.5 text-green-500">
                                        <UserCheck className="h-4 w-4" />
                                        <span className="font-bold text-xs uppercase tracking-tight">Réactiver</span>
                                    </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator className="bg-slate-800" />
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="cursor-pointer gap-2 py-2.5 text-red-500">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="font-bold text-xs uppercase tracking-tight">Supprimer</span>
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                            </DropdownMenuContent>
                        </DropdownMenuPortal>
                    </DropdownMenu>
                    <AlertDialogContent className="bg-slate-900 border-slate-800">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black text-white uppercase tracking-tight">Attention</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                                Supprimer définitivement <b>{targetUser.fullName || targetUser.email}</b> ? Cette action est irréversible.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-800 border-none">Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="bg-red-600 font-bold">
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Supprimer
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
    const usersQuery = useMemo(() => query(collection(db, 'users')), [db]);
    const { data: users, isLoading } = useCollection<NdaraUser>(usersQuery);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<NdaraUser | null>(null);
    const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        let list = [...users];
        
        // On affiche d'abord tout le monde, puis on filtre si nécessaire
        if (searchTerm.trim() !== '') {
            const s = searchTerm.toLowerCase();
            list = list.filter(u => 
                (u.fullName || '').toLowerCase().includes(s) || 
                (u.email || '').toLowerCase().includes(s) || 
                (u.username || '').toLowerCase().includes(s)
            );
        }
        
        // Tri manuel en mémoire par date de création (décroissant)
        return list.sort((a, b) => {
            const dA = (a.createdAt as any)?.toDate?.() || new Date(0);
            const dB = (b.createdAt as any)?.toDate?.() || new Date(0);
            return dB.getTime() - dA.getTime();
        });
    }, [users, searchTerm]);

    const handleOpenGrantModal = (user: NdaraUser) => {
        setSelectedUser(user);
        setIsGrantModalOpen(true);
    };

    const handleViewProfile = (user: NdaraUser) => {
        setSelectedUser(user);
        setIsDetailsModalOpen(true);
    };
    
    return (
        <div className="space-y-6">
            <GrantCourseModal isOpen={isGrantModalOpen} onOpenChange={setIsGrantModalOpen} targetUser={selectedUser} />
            <UserDetailsModal isOpen={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen} user={selectedUser} />

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input 
                        placeholder="Chercher par nom, email..." 
                        className="pl-10 h-12 bg-slate-900 border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus-visible:ring-primary/30"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                 <Button className="h-12 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                    <PlusCircle className="mr-2 h-4 w-4" /> Nouveau membre
                </Button>
            </div>

             <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-800 bg-slate-800/30">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Utilisateur</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Email</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Rôle</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Statut</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i} className="border-slate-800"><TableCell colSpan={6}><Skeleton className="h-12 w-full bg-slate-800/50 rounded-xl"/></TableCell></TableRow>
                            ))
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map(user => (
                                <UserRow 
                                    key={user.id} 
                                    user={user as any} 
                                    onGrantRequest={handleOpenGrantModal}
                                    onViewProfile={handleViewProfile}
                                />
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={6} className="h-64 text-center opacity-20"><Users className="h-16 w-16 mx-auto mb-4" /><p className="font-black uppercase text-xs">Aucun membre trouvé</p></TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
