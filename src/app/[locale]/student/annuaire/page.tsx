
'use client';

import { useState, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDebounce } from '@/hooks/use-debounce';
import { startChat } from '@/lib/chat';
import { useToast } from '@/hooks/use-toast';
import type { NdaraUser } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UserSearch, AlertCircle } from 'lucide-react';
import { MemberCard } from '@/components/cards/MemberCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
            member.fullName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
    }, [allMembers, debouncedSearchTerm]);

    const handleContact = async (contactId: string) => {
        if (!currentUser) return;
        if (!currentUser.isProfileComplete) {
            toast({
                variant: 'destructive',
                title: "Profil Incomplet",
                description: "Veuillez compléter votre profil pour contacter d'autres membres.",
            });
            return;
        }
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
    const isProfileIncomplete = !currentUser?.isProfileComplete;

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-white">Annuaire des Membres</h1>
                <p className="text-muted-foreground">
                    Connectez-vous avec d'autres apprenants partageant vos centres d'intérêt.
                </p>
            </header>

             {isProfileIncomplete && (
                <Alert className="bg-amber-900/40 border-amber-500/30 text-amber-300">
                    <AlertCircle className="h-4 w-4 !text-amber-300" />
                    <AlertTitle className="font-bold text-white">Action requise</AlertTitle>
                    <AlertDescription>
                        Pour contacter d'autres membres et apparaître dans l'annuaire, veuillez <Link href="/account" className="font-bold underline hover:text-amber-200">compléter votre profil</Link>.
                    </AlertDescription>
                </Alert>
            )}

            <div className="relative max-w-lg">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                    placeholder="Rechercher un membre par nom..."
                    className="h-12 pl-12 bg-slate-800 border-slate-700 text-base rounded-full"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    disabled={isProfileIncomplete}
                />
            </div>
            
            {isLoading ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-[288px] w-full rounded-2xl bg-slate-800" />)}
                 </div>
            ) : filteredMembers && filteredMembers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
