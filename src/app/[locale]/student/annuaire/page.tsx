
'use client';

/**
 * @fileOverview Annuaire communautaire Ndara Afrique.
 * Favorise la mise en relation par filière d'apprentissage.
 */

import { useState, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { startChat } from '@/lib/chat';
import { useToast } from '@/hooks/use-toast';
import type { NdaraUser } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MessageSquare, Loader2, Users, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AnnuairePage() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [isContacting, setIsContacting] = useState<string | null>(null);

    // Requête principale : Membres du même domaine
    const membersQuery = useMemo(() => {
        return query(
            collection(db, 'users'),
            where('isProfileComplete', '==', true),
            orderBy('fullName'),
            limit(50)
        );
    }, [db]);

    const { data: allMembers, isLoading: membersLoading } = useCollection<NdaraUser>(membersQuery);

    const filteredMembers = useMemo(() => {
        if (!allMembers) return [];
        let list = allMembers.filter(m => m.uid !== currentUser?.uid);
        
        if (searchTerm) {
            list = list.filter(m => 
                m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.careerGoals?.interestDomain?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return list;
    }, [allMembers, searchTerm, currentUser?.uid]);

    const handleContact = async (memberId: string) => {
        if (!currentUser) return;
        setIsContacting(memberId);
        try {
            const chatId = await startChat(currentUser.uid, memberId);
            router.push(`/student/messages?chatId=${chatId}`);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Erreur", description: error.message });
        } finally {
            setIsContacting(null);
        }
    };

    const isLoading = isUserLoading || membersLoading;

    return (
        <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen bg-grainy">
            <header className="px-4 pt-8 space-y-4">
                <div className="flex items-center gap-2 text-[#CC7722]">
                    <Sparkles className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Communauté</span>
                </div>
                <h1 className="text-3xl font-black text-white leading-tight">Annuaire des <br/><span className="text-[#CC7722]">Ndara</span></h1>
                
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
                    <Input
                        placeholder="Chercher un Ndara ou un domaine..."
                        className="h-14 pl-12 bg-slate-900 border-slate-800 rounded-2xl text-white placeholder:text-slate-600"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            <div className="px-4 space-y-4">
                {isLoading ? (
                    <div className="grid gap-4">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl bg-slate-900" />)}
                    </div>
                ) : filteredMembers.length > 0 ? (
                    <div className="grid gap-4">
                        {filteredMembers.map(member => (
                            <div key={member.uid} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-4 flex items-center gap-4 group active:scale-95 transition-all">
                                <Avatar className="h-16 w-16 border-2 border-slate-800 shadow-xl">
                                    <AvatarImage src={member.profilePictureURL} className="object-cover" />
                                    <AvatarFallback>{member.fullName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-white text-base truncate">{member.fullName}</h3>
                                    <Badge className="bg-[#CC7722]/10 text-[#CC7722] border-none text-[9px] font-black uppercase mt-1">
                                        {member.careerGoals?.interestDomain || 'Apprenant'}
                                    </Badge>
                                </div>
                                <Button 
                                    size="icon" 
                                    className="h-12 w-12 rounded-2xl bg-slate-800 hover:bg-[#CC7722] text-slate-400 hover:text-white transition-all shadow-lg"
                                    onClick={() => handleContact(member.uid)}
                                    disabled={isContacting === member.uid}
                                >
                                    {isContacting === member.uid ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5" />}
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center flex flex-col items-center opacity-30">
                        <Users className="h-16 w-16 mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest">Aucun membre trouvé</p>
                    </div>
                )}
            </div>
        </div>
    );
}
