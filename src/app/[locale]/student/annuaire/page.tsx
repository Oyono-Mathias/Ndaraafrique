'use client';

import { useState, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where } from 'firebase/firestore';
import { useRouter } from 'next-intl/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { startChat } from '@/lib/chat';
import { useToast } from '@/hooks/use-toast';
import type { NdaraUser } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Frown, UserSearch } from 'lucide-react';
import { MemberCard } from '@/components/cards/MemberCard';

export default function AnnuairePage() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [isContacting, setIsContacting] = useState<string | null>(null);

    // Query for users in the same interest domain, excluding the current user.
    const membersQuery = useMemo(() => {
        if (!currentUser?.careerGoals?.interestDomain || !currentUser?.uid) return null;
        return query(
            collection(db, 'users'),
            where('careerGoals.interestDomain', '==', currentUser.careerGoals.interestDomain),
            where('isProfileComplete', '==', true),
            where('uid', '!=', currentUser.uid)
        );
    }, [db, currentUser]);

    const { data: allMembers, isLoading: membersLoading } = useCollection<NdaraUser>(membersQuery);

    const filteredMembers = useMemo(() => {
        if (!allMembers) return [];
        if (!debouncedSearchTerm) return allMembers;
        return allMembers.filter(member =>
            member.username?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            member.fullName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
    }, [allMembers, debouncedSearchTerm]);

    const handleContact = async (contactId: string) => {
        if (!currentUser) return;
        setIsContacting(contactId);
        try {
            const chatId = await startChat(currentUser.uid, contactId);
            router.push(`/student/messages?chatId=${chatId}`);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Impossible de démarrer la conversation",
                description: error.message,
            });
        } finally {
            setIsContacting(null);
        }
    };

    const isLoading = isUserLoading || membersLoading;
    const domain = currentUser?.careerGoals?.interestDomain;

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-white">Annuaire des Membres</h1>
                {domain ? (
                    <p className="text-muted-foreground">
                        Connectez-vous avec d'autres apprenants de la filière <span className="font-semibold text-primary">{domain}</span>.
                    </p>
                ) : (
                     <p className="text-amber-400">Complétez votre profil pour accéder à l'annuaire de votre filière.</p>
                )}
            </header>

            {domain && (
                <div className="relative max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                        placeholder="Rechercher un membre par nom..."
                        className="h-12 pl-12 bg-slate-800 border-slate-700 text-base"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            )}
            
            {isLoading ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl bg-slate-800" />)}
                 </div>
            ) : filteredMembers && filteredMembers.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredMembers.map(member => (
                        <MemberCard 
                            key={member.uid} 
                            member={member} 
                            onContact={handleContact} 
                            isProcessing={isContacting === member.uid}
                        />
                    ))}
                </div>
            ) : (
                 <div className="text-center py-20 border-2 border-dashed border-slate-700 rounded-xl mt-8">
                    <UserSearch className="mx-auto h-12 w-12 text-slate-500" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-300">Aucun membre trouvé</h3>
                    <p className="mt-1 text-sm text-slate-400">
                        {debouncedSearchTerm ? "Essayez une autre recherche." : "Aucun autre membre n'a été trouvé dans votre filière pour le moment."}
                    </p>
                </div>
            )}
        </div>
    );
}
