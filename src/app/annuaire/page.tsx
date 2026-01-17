
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import {
  getFirestore,
  collection,
  query,
  where,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, UserX } from 'lucide-react';
import type { NdaraUser } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { startChat } from '@/lib/chat';
import { MemberCard } from '@/components/cards/MemberCard';

const ProfileCompletionModal = ({ isOpen, onGoToProfile }: { isOpen: boolean, onGoToProfile: () => void }) => {
    const t = useTranslations();
    return (
        <Dialog open={isOpen}>
            <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader className="items-center text-center">
                    <div className="p-3 rounded-full bg-destructive/10 w-fit mb-2">
                        <UserX className="text-destructive h-6 w-6"/> 
                    </div>
                    <DialogTitle>{t('profile_incomplete_title')}</DialogTitle>
                    <DialogDescription className="pt-2">{t('profile_incomplete_desc_directory')}</DialogDescription>
                </DialogHeader>
                 <DialogFooter>
                    <Button onClick={onGoToProfile} className="w-full">{t('complete_profile_btn')}</Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function DirectoryPage() {
  const { user, currentUser } = useRole();
  const db = getFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations();
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState<NdaraUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const isProfileComplete = useMemo(() => !!(currentUser?.username && currentUser?.careerGoals?.interestDomain), [currentUser]);

  useEffect(() => {
    if (!currentUser) {
        setIsLoading(false);
        return;
    }
    
    if (!isProfileComplete) {
        setIsLoading(false);
        setMembers([]);
        return;
    }

    const userInterestDomain = currentUser.careerGoals?.interestDomain;
    if (!userInterestDomain) {
        setIsLoading(false);
        setMembers([]);
        return;
    }

    setIsLoading(true);
    const usersQuery = query(
        collection(db, 'users'),
        where('isProfileComplete', '==', true),
        where('careerGoals.interestDomain', '==', userInterestDomain),
        limit(50)
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const memberList = snapshot.docs
            .map(doc => doc.data() as NdaraUser)
            .filter(member => member.uid !== user?.uid); 
        setMembers(memberList);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching directory members:", error);
        toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger l'annuaire. Un index Firestore est peut-être manquant."});
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, db, isProfileComplete, user?.uid, toast]);


  const handleContact = async (contactId: string) => {
    if (!user || !currentUser) return;
    setIsCreatingChat(true);
    try {
      const chatId = await startChat(user.uid, contactId);
      router.push(`/messages/${chatId}`);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur de Chat', description: error.message });
    } finally {
      setIsCreatingChat(false);
    }
  };

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    return members.filter(member => {
        if (!member.username) return false;
        return member.username.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    });
  }, [members, debouncedSearchTerm]);


  return (
    <div className="space-y-8">
      <ProfileCompletionModal isOpen={!isProfileComplete} onGoToProfile={() => router.push('/account')} />
      <header>
        <h1 className="text-3xl font-bold text-white">Annuaire des membres</h1>
        <p className="text-muted-foreground">
          {isProfileComplete ? `Trouvez et connectez-vous avec d'autres apprenants de votre filière : ${currentUser?.careerGoals?.interestDomain}` : 'Complétez votre profil pour accéder à l\'annuaire.'}
        </p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Rechercher par nom d'utilisateur..."
          className="pl-10 max-w-sm bg-background/50 border-slate-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={!isProfileComplete}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {isLoading ? (
          [...Array(10)].map((_, i) => (
            <div key={i} className="text-center p-4 glassmorphism-card rounded-2xl flex flex-col justify-between">
                <Skeleton className="h-20 w-20 rounded-full mx-auto mb-3" />
                <Skeleton className="h-5 w-3/4 mx-auto mb-2" />
                <Skeleton className="h-3 w-1/2 mx-auto mb-3" />
                <Skeleton className="h-9 w-full mt-2" />
            </div>
          ))
        ) : filteredMembers.length > 0 ? (
          filteredMembers.map(member => (
            <MemberCard key={member.uid} member={member} onContact={handleContact} isProcessing={isCreatingChat} />
          ))
        ) : (
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-lg border-slate-700">
            <Users className="mx-auto h-12 w-12 text-slate-500" />
            <h3 className="mt-4 text-lg font-semibold text-slate-300">Aucun membre trouvé</h3>
            <p className="mt-1 text-sm text-slate-400">
              {debouncedSearchTerm
                ? `Aucun résultat pour "${debouncedSearchTerm}". Essayez un autre nom.`
                : "L'annuaire pour votre filière est actuellement vide."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
