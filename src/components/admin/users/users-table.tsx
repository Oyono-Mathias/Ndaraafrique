
'use client';

/**
 * @fileOverview Répertoire des Membres Ndara Afrique - Design Elite Qwen.
 * ✅ ANDROID-FIRST : Liste de cartes tactiles, recherche et filtres par pilules.
 * ✅ TEMPS RÉEL : Synchronisation complète avec Firebase.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
import type { NdaraUser, UserRole } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  MoreVertical,
  User as UserProfileIcon,
  Trash2,
  Loader2,
  MessageSquare,
  Gift,
  UserCog,
  Ban,
  UserCheck,
  Plus,
  Filter,
  Mic,
  ShieldCheck,
  Star,
  MapPin,
  Clock
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
import { cn } from '@/lib/utils';
import { africanCountries } from '@/lib/countries';

const UserCard = ({ 
    user: targetUser, 
    onGrantRequest, 
    onViewProfile 
}: { 
    user: NdaraUser, 
    onGrantRequest: (user: NdaraUser) => void,
    onViewProfile: (user: NdaraUser) => void
}) => {
    const { currentUser: adminUser, user: adminAuthUser } = useRole();
    const { toast } = useToast();
    const router = useRouter();
    const [isActionLoading, setIsActionLoading] = useState(false);

    const handleStatusUpdate = async (status: 'active' | 'suspended') => {
        if (!adminUser || isActionLoading) return;
        setIsActionLoading(true);
        const result = await updateUserStatus({ userId: targetUser.uid, status, adminId: adminUser.uid });
        if (result.success) toast({ title: status === 'active' ? 'Compte réactivé' : 'Compte suspendu' });
        else toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        setIsActionLoading(false);
    };

    const handleRoleChange = async (newRole: UserRole) => {
        if (!adminUser || newRole === targetUser.role || isActionLoading) return;
        setIsActionLoading(true);
        const result = await updateUserRole({ userId: targetUser.uid, role: newRole, adminId: adminUser.uid });
        if (result.success) toast({ title: 'Rôle mis à jour' });
        else toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        setIsActionLoading(false);
    };

    const handleContact = async () => {
        if (!adminUser || isActionLoading) return;
        setIsActionLoading(true);
        try {
            const chatId = await startChat(adminUser.uid, targetUser.uid);
            router.push(`/admin/messages?chatId=${chatId}`);
        } catch (error) {
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible de lancer le chat." });
        } finally {
            setIsActionLoading(false);
        }
    };

    const createdAt = (targetUser.createdAt as any)?.toDate?.() || null;
    const country = africanCountries.find(c => c.code === targetUser.countryCode);

    return (
        <div className={cn(
            "bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-4 relative overflow-hidden transition-all active:scale-[0.98] group",
            targetUser.status === 'suspended' && "opacity-60 grayscale"
        )}>
            {targetUser.status === 'suspended' && (
                <div className="absolute inset-0 bg-red-900/5 pointer-events-none" />
            )}
            
            <div className="flex items-start gap-4 relative z-10">
                {/* Avatar Zone */}
                <div className="relative flex-shrink-0">
                    <div className={cn(
                        "w-14 h-14 rounded-full overflow-hidden border-2 shadow-xl",
                        targetUser.role === 'admin' ? "border-purple-500" : targetUser.role === 'instructor' ? "border-primary" : "border-slate-700"
                    )}>
                        <Avatar className="h-full w-full">
                            <AvatarImage src={targetUser.profilePictureURL} className="object-cover" />
                            <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">
                                {targetUser.fullName?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    {targetUser.isOnline && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full border-2 border-slate-950 shadow-[0_0_10px_#10b981] animate-pulse" />
                    )}
                </div>

                {/* Info Zone */}
                <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-black text-white text-base truncate uppercase tracking-tight">
                            {targetUser.fullName}
                        </h3>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="text-slate-500 hover:text-white transition p-1">
                                    <MoreVertical size={20} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-300">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Actions Admin</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-800" />
                                <DropdownMenuItem onClick={() => onViewProfile(targetUser)} className="gap-2 py-3 cursor-pointer">
                                    <UserProfileIcon size={16} className="text-primary" /> Voir Profil
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleContact} className="gap-2 py-3 cursor-pointer">
                                    <MessageSquare size={16} className="text-blue-400" /> Messagerie
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onGrantRequest(targetUser)} className="gap-2 py-3 cursor-pointer">
                                    <Gift size={16} className="text-primary" /> Offrir un cours
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator className="bg-slate-800" />
                                
                                {targetUser.role !== 'admin' && (
                                    <>
                                        {targetUser.role === 'student' ? (
                                            <DropdownMenuItem onClick={() => handleRoleChange('instructor')} className="gap-2 py-3 cursor-pointer text-primary">
                                                <Star size={16} /> Passer Expert
                                            </DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem onClick={() => handleRoleChange('student')} className="gap-2 py-3 cursor-pointer">
                                                <UserCog size={16} /> Retirer droits Expert
                                            </DropdownMenuItem>
                                        )}
                                    </>
                                )}

                                {targetUser.status === 'active' ? (
                                    <DropdownMenuItem onClick={() => handleStatusUpdate('suspended')} className="gap-2 py-3 cursor-pointer text-red-500">
                                        <Ban size={16} /> Suspendre
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => handleStatusUpdate('active')} className="gap-2 py-3 cursor-pointer text-emerald-500">
                                        <UserCheck size={16} /> Réactiver
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    
                    <p className="text-primary text-[10px] font-black uppercase tracking-widest mb-3">@{targetUser.username}</p>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge className={cn(
                            "border-none text-[8px] font-black uppercase px-2 py-0.5 h-4",
                            targetUser.role === 'admin' ? "bg-purple-500/20 text-purple-400" : targetUser.role === 'instructor' ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"
                        )}>
                            {targetUser.role === 'admin' ? 'Super Admin' : targetUser.role === 'instructor' ? 'Expert' : 'Étudiant'}
                        </Badge>
                        
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                            <span>{country?.emoji || '🌍'}</span>
                            <span className="truncate max-w-[80px]">{targetUser.countryName || 'Afrique'}</span>
                        </div>

                        {createdAt && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase tracking-tighter ml-auto">
                                <Clock size={10} />
                                {format(createdAt, 'MMM yyyy', { locale: fr })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export function UsersTable() {
    const db = getFirestore();
    const { toast } = useToast();
    const usersQuery = useMemo(() => query(collection(db, 'users'), orderBy('createdAt', 'desc')), [db]);
    const { data: users, isLoading } = useCollection<NdaraUser>(usersQuery);

    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'student' | 'instructor' | 'admin' | 'suspended'>('all');
    const [selectedUser, setSelectedUser] = useState<NdaraUser | null>(null);
    const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(u => {
            const matchesSearch = (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (u.username || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            let matchesFilter = true;
            if (activeFilter === 'student') matchesFilter = u.role === 'student';
            else if (activeFilter === 'instructor') matchesFilter = u.role === 'instructor';
            else if (activeFilter === 'admin') matchesFilter = u.role === 'admin';
            else if (activeFilter === 'suspended') matchesFilter = u.status === 'suspended';

            return matchesSearch && matchesFilter;
        });
    }, [users, searchTerm, activeFilter]);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-32">
            <GrantCourseModal isOpen={isGrantModalOpen} onOpenChange={setIsGrantModalOpen} targetUser={selectedUser} />
            <UserDetailsModal isOpen={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen} user={selectedUser} />

            {/* Header & Search */}
            <div className="space-y-6">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Rechercher un membre, email..." 
                        className="h-14 pl-12 bg-slate-900/50 border-white/5 rounded-full text-white placeholder:text-slate-600 focus-visible:ring-primary/20 shadow-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary active:scale-95">
                        <Mic size={18} />
                    </button>
                </div>

                {/* Filter Pills */}
                <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
                    {['all', 'student', 'instructor', 'admin', 'suspended'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter as any)}
                            className={cn(
                                "flex-shrink-0 px-6 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                                activeFilter === filter 
                                    ? "bg-primary text-slate-950 border-primary shadow-lg shadow-primary/20" 
                                    : "bg-slate-900 border-white/5 text-slate-500 hover:text-white"
                            )}
                        >
                            {filter === 'all' ? 'Tous' : filter === 'student' ? 'Étudiants' : filter === 'instructor' ? 'Experts' : filter === 'admin' ? 'Admins' : 'Suspendus'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Users List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[2rem] bg-slate-900" />)}
                    </div>
                ) : filteredUsers.length > 0 ? (
                    <div className="grid gap-4">
                        {filteredUsers.map(user => (
                            <UserCard 
                                key={user.uid} 
                                user={user} 
                                onGrantRequest={(u) => { setSelectedUser(u); setIsGrantModalOpen(true); }}
                                onViewProfile={(u) => { setSelectedUser(u); setIsDetailsModalOpen(true); }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-24 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-20">
                        <Search className="h-16 w-16 mx-auto mb-4 text-slate-700" />
                        <p className="font-black uppercase tracking-widest text-xs">Aucun membre trouvé</p>
                    </div>
                )}
            </div>

            {/* FAB Button */}
            <button 
                onClick={() => toast({ title: "Importation CSV", description: "Bientôt disponible dans le cockpit." })}
                className="fixed bottom-24 right-6 w-16 h-16 bg-primary rounded-full flex items-center justify-center text-slate-950 shadow-2xl shadow-primary/40 z-40 hover:bg-emerald-400 transition-all active:scale-90 animate-pulse-glow"
            >
                <Plus size={32} strokeWidth={3} />
            </button>
        </div>
    );
}
