'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, getDocs, where } from 'firebase/firestore';
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
  Users,
  Globe,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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

const UserRow = ({ user: targetUser, onGrantRequest }: { user: NdaraUser, onGrantRequest: (user: NdaraUser) => void }) => {
    const { currentUser: adminUser, user: adminAuthUser } = useRole();
    const { toast } = useToast();
    const router = useRouter();
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const handleStatusUpdate = async (status: 'active' | 'suspended') => {
        if (!adminUser || isActionLoading) return;
        setIsActionLoading(true);
        const result = await updateUserStatus({ userId: targetUser.uid, status, adminId: adminUser.uid });
        if (result.success) {
            toast({ title: 'Statut mis à jour' });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
        setIsActionLoading(false);
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
        } else {
            toast({ title: "Profil étudiant", description: "La vue détaillée du profil étudiant sera bientôt disponible." });
        }
    };
    
    const handleContactUser = async () => {
        if (!adminUser || isActionLoading) return;
        setIsActionLoading(true);
        try {
            const chatId = await startChat(adminUser.uid, targetUser.uid);
            router.push(`/admin/messages?chatId=${chatId}`);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erreur de messagerie',
                description: error.message || "Impossible de démarrer la conversation.",
            });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleRoleChange = async (newRole: UserRole) => {
        if (!adminUser || newRole === targetUser.role || isActionLoading) return;
        setIsActionLoading(true);
        const result = await updateUserRole({ userId: targetUser.uid, role: newRole, adminId: adminUser.uid });
        if (result.success) {
            toast({ title: 'Rôle mis à jour avec succès.' });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
        setIsActionLoading(false);
    };

    const canInteract = adminUser?.uid !== targetUser.uid;
    const canDelete = canInteract && targetUser.role !== 'admin';
    const canChangeRole = canInteract && targetUser.role !== 'admin';

    const createdAt = (targetUser.createdAt as any)?.toDate?.() || null;

    return (
        <TableRow className="group">
            <TableCell>
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-slate-800">
                        <AvatarImage src={targetUser.profilePictureURL} />
                        <AvatarFallback className="bg-slate-800 text-slate-500 font-bold">{targetUser.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm text-white">{targetUser.fullName}</span>
                        <span className="text-[10px] text-slate-500 font-medium">@{targetUser.username}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-xs text-slate-400 font-medium">{targetUser.email}</TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">{targetUser.countryName || '---'}</span>
                    {targetUser.countryCode && (
                        <span className="text-[9px] font-black text-slate-600 uppercase">({targetUser.countryCode})</span>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <Badge variant={targetUser.role === 'admin' ? 'destructive' : targetUser.role === 'instructor' ? 'secondary' : 'default'} className="font-black text-[9px] uppercase tracking-widest border-none px-2 py-0">
                    {targetUser.role}
                </Badge>
            </TableCell>
            <TableCell>
                 <Badge variant={targetUser.status === 'active' ? 'success' : 'warning'} className="font-black text-[9px] uppercase tracking-widest border-none px-2 py-0">
                    {targetUser.status || 'N/A'}
                 </Badge>
            </TableCell>
            <TableCell className="text-[10px] font-black text-slate-500 uppercase">
                {createdAt ? format(createdAt, "d MMM yyyy", { locale: fr }) : '---'}
            </TableCell>
            <TableCell className="text-right">
                <AlertDialog border-slate-800 open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all active:scale-90" disabled={isActionLoading}>
                                {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" />}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-300">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Actions Utilisateur</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-800" />
                                
                                <DropdownMenuItem onClick={handleViewProfile} className="cursor-pointer gap-2 py-2.5">
                                    <UserProfileIcon className="h-4 w-4 text-primary" />
                                    <span className="font-bold text-xs uppercase tracking-tight">Voir le profil</span>
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem onClick={handleContactUser} disabled={!canInteract} className="cursor-pointer gap-2 py-2.5">
                                    <MessageSquare className="h-4 w-4 text-blue-400" />
                                    <span className="font-bold text-xs uppercase tracking-tight">Envoyer un message</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => onGrantRequest(targetUser)} className="cursor-pointer gap-2 py-2.5 text-primary">
                                    <Gift className="h-4 w-4 text-primary" />
                                    <span className="font-bold text-xs uppercase tracking-tight">Offrir un cours</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-slate-800" />
                                
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger disabled={!canChangeRole} className="cursor-pointer gap-2 py-2.5">
                                        <UserCog className="h-4 w-4 text-amber-400" />
                                        <span className="font-bold text-xs uppercase tracking-tight">Modifier le rôle</span>
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent className="bg-slate-900 border-slate-800 text-slate-300">
                                            <DropdownMenuItem onClick={() => handleRoleChange('student')} className="cursor-pointer font-bold text-xs uppercase">Étudiant</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleRoleChange('instructor')} className="cursor-pointer font-bold text-xs uppercase">Instructeur</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleRoleChange('admin')} className="cursor-pointer font-bold text-xs uppercase text-red-400">Administrateur</DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>

                                {targetUser.status === 'active' ? (
                                    <DropdownMenuItem onClick={() => handleStatusUpdate('suspended')} className="cursor-pointer gap-2 py-2.5 text-amber-500 focus:text-amber-500 focus:bg-amber-500/10" disabled={!canInteract}>
                                        <Ban className="h-4 w-4" />
                                        <span className="font-bold text-xs uppercase tracking-tight">Suspendre l'accès</span>
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => handleStatusUpdate('active')} className="cursor-pointer gap-2 py-2.5 text-green-500 focus:text-green-500 focus:bg-green-500/10" disabled={!canInteract}>
                                        <UserCheck className="h-4 w-4" />
                                        <span className="font-bold text-xs uppercase tracking-tight">Réactiver le compte</span>
                                    </DropdownMenuItem>
                                )}

                                {canDelete && (
                                    <>
                                    <DropdownMenuSeparator className="bg-slate-800" />
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="cursor-pointer gap-2 py-2.5 text-red-500 focus:text-red-500 focus:bg-red-500/10">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="font-bold text-xs uppercase tracking-tight">Supprimer définitivement</span>
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenuPortal>
                    </DropdownMenu>
                    <AlertDialogContent className="bg-slate-900 border-slate-800">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black text-white uppercase tracking-tight">Attention !</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                                Cette action est irréversible. Toutes les données de <b className="text-white">{targetUser.fullName}</b> seront définitivement supprimées du système.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-800 border-none text-slate-300">Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Confirmer la suppression
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
    const [selectedUserForGrant, setSelectedUserForGrant] = useState<NdaraUser | null>(null);
    const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(user => 
            user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.username?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const handleOpenGrantModal = (user: NdaraUser) => {
        setSelectedUserForGrant(user);
        setIsGrantModalOpen(true);
    };
    
    return (
        <div className="space-y-6">
            <GrantCourseModal 
                isOpen={isGrantModalOpen} 
                onOpenChange={setIsGrantModalOpen} 
                targetUser={selectedUserForGrant} 
            />

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
                 <Button className="h-12 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nouvel utilisateur
                </Button>
            </div>

             <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-800 bg-slate-800/30">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Nom & Identifiant</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Adresse Email</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Pays</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Rôle</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Statut</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Inscription</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i} className="border-slate-800">
                                    <TableCell colSpan={7}><Skeleton className="h-12 w-full bg-slate-800/50 rounded-xl"/></TableCell>
                                </TableRow>
                            ))
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map(user => (
                                <UserRow 
                                    key={user.uid} 
                                    user={user} 
                                    onGrantRequest={handleOpenGrantModal}
                                />
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center opacity-20">
                                        <Users className="h-16 w-16 mb-4" />
                                        <p className="font-black uppercase tracking-widest text-xs">Aucun membre trouvé</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
