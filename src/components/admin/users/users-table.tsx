'use client';

/**
 * @fileOverview Répertoire des Membres Ndara Afrique - Cockpit Admin v2.5.
 * ✅ RÉSOLU : Utilisation du composant AdminUserActions pour toutes les commandes.
 * ✅ SÉCURITÉ : Validation serveur sur chaque action critique.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
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
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { africanCountries } from '@/lib/countries';
import { AdminUserActions } from './AdminUserActions';

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
    const usersQuery = useMemo(() => query(collection(db, 'users'), orderBy('createdAt', 'desc')), [db]);
    const { data: users, isLoading } = useCollection<NdaraUser>(usersQuery);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(u => 
            (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (u.username || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    if (isLoading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[2rem] bg-slate-900" />)}</div>;

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
                {filteredUsers.map(user => <UserCard key={user.uid} user={user} />)}
            </div>
        </div>
    );
}
