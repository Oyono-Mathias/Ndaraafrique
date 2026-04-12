'use client';

/**
 * @fileOverview Répertoire des Membres Ndara Afrique - Optimisé pour la performance.
 * ✅ PAGINATION : Chargement par lots de 20 avec extension dynamique.
 * ✅ RÉEL : Toujours synchronisé en temps réel sur la fenêtre visible.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, limit } from 'firebase/firestore';
import type { NdaraUser } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Loader2,
  Users
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { africanCountries } from '@/lib/countries';
import { AdminUserActions } from './AdminUserActions';

const PAGE_SIZE = 20;

const UserCard = ({ user: targetUser }: { user: NdaraUser }) => {
    const createdAt = (targetUser.createdAt as any)?.toDate?.() || null;
    const country = africanCountries.find(c => c.code === targetUser.countryCode);

    return (
        <div className={cn(
            "bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-4 relative overflow-hidden transition-all group shadow-xl",
            targetUser.status === 'suspended' && "opacity-60 grayscale"
        )}>
            <div className="flex items-start gap-4 relative z-10">
                <div className="relative flex-shrink-0">
                    <div className={cn(
                        "w-14 h-14 rounded-full overflow-hidden border-2",
                        targetUser.role === 'admin' ? "border-purple-500" : targetUser.role === 'instructor' ? "border-primary" : "border-slate-700"
                    )}>
                        <Avatar className="h-full w-full">
                            <AvatarImage src={targetUser.profilePictureURL} className="object-cover" />
                            <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">{targetUser.fullName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>
                    {targetUser.isOnline && <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full border-2 border-slate-950 animate-pulse" />}
                </div>

                <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-black text-white text-base truncate uppercase tracking-tight">{targetUser.fullName}</h3>
                        <AdminUserActions user={targetUser} />
                    </div>
                    
                    <p className="text-primary text-[10px] font-black uppercase tracking-widest mb-3">@{targetUser.username}</p>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge className={cn(
                            "border-none text-[8px] font-black uppercase px-2 py-0.5",
                            targetUser.role === 'admin' ? "bg-purple-500/20 text-purple-400" : targetUser.role === 'instructor' ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"
                        )}>
                            {targetUser.role}
                        </Badge>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                            <span>{country?.emoji || '🌍'}</span>
                            <span className="truncate max-w-[80px]">{targetUser.countryName || 'Afrique'}</span>
                        </div>
                        {createdAt && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase ml-auto">
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
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [searchTerm, setSearchTerm] = useState('');

    const usersQuery = useMemo(() => query(
        collection(db, 'users'), 
        orderBy('createdAt', 'desc'),
        limit(visibleCount)
    ), [db, visibleCount]);

    const { data: users, isLoading } = useCollection<NdaraUser>(usersQuery);

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(u => 
            (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (u.username || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + PAGE_SIZE);
    };

    return (
        <div className="space-y-6">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                <Input 
                    placeholder="Chercher un membre, email..." 
                    className="h-14 pl-12 bg-slate-900/50 border-white/5 rounded-full text-white placeholder:text-slate-600 focus-visible:ring-primary/20 shadow-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid gap-4">
                {isLoading && !users ? (
                    [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[2.5rem] bg-slate-900" />)
                ) : filteredUsers.length > 0 ? (
                    <>
                        {filteredUsers.map(user => <UserCard key={user.uid} user={user} />)}
                        
                        {!searchTerm && users && users.length >= visibleCount && (
                            <div className="flex justify-center pt-4 pb-8">
                                <Button 
                                    onClick={handleLoadMore}
                                    variant="outline"
                                    className="h-12 px-8 rounded-2xl border-white/5 bg-slate-900 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-primary transition-all active:scale-95"
                                >
                                    {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                                    Charger plus de membres
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="py-24 text-center opacity-20">
                        <Users className="h-16 w-16 mx-auto mb-4" />
                        <p className="font-black uppercase tracking-widest">Aucun utilisateur trouvé</p>
                    </div>
                )}
            </div>
        </div>
    );
}