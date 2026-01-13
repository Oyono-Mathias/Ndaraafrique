
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
  addDoc,
  serverTimestamp,
  getDocs,
  doc,
  setDoc,
} from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MessageSquare, Users, UserX } from 'lucide-react';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

const MemberCard = ({ member, onContact }: { member: FormaAfriqueUser; onContact: (memberId: string) => void; }) => {
  return (
    <Card className="text-center p-4 bg-slate-800/50 border border-slate-700 shadow-sm hover:shadow-lg hover:border-primary/50 transition-shadow">
      <Avatar className="mx-auto h-16 w-16 mb-3 border-2 border-primary/20">
        <AvatarImage src={member.profilePictureURL} />
        <AvatarFallback className="text-xl bg-slate-700 text-primary font-semibold">
          {member.username?.charAt(0).toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
      <h3 className="font-bold text-sm text-slate-100 truncate">@{member.username}</h3>
      <p className="text-xs text-slate-400 mb-3 truncate">{member.careerGoals?.interestDomain || 'Apprenant'}</p>
      <Button size="sm" onClick={() => onContact(member.uid)} className="bg-primary hover:bg-primary/90 text-xs h-8">
        <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
        Contacter
      </Button>
    </Card>
  );
};

const ProfileCompletionModal = ({ isOpen, onGoToProfile }: { isOpen: boolean, onGoToProfile: () => void }) => {
    const { t } = useTranslation();
    return (
        <Dialog open={isOpen}>
            <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><UserX className="text-destructive"/> {t('profile_incomplete_title')}</DialogTitle>
                    <DialogDescription className="pt-2">{t('profile_incomplete_desc_directory')}</DialogDescription>
                </DialogHeader>
                <Button onClick={onGoToProfile}>{t('complete_profile_btn')}</Button>
            </DialogContent>
        </Dialog>
    );
};

export default function DirectoryPage() {
  const { user, formaAfriqueUser } = useRole();
  const db = getFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState<FormaAfriqueUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const isProfileComplete = useMemo(() => !!(formaAfriqueUser?.username && formaAfriqueUser?.careerGoals?.interestDomain), [formaAfriqueUser]);

  useEffect(() => {
    if (!formaAfriqueUser) {
        setIsLoading(false);
        return;
    }
    
    // Do not fetch if profile is incomplete
    if (!isProfileComplete) {
        setIsLoading(false);
        setMembers([]);
        return;
    }

    const userInterestDomain = formaAfriqueUser.careerGoals?.interestDomain;
    if (!userInterestDomain) {
        setIsLoading(false);
        setMembers([]);
        return;
    }

    setIsLoading(true);
    const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'student'),
        where('careerGoals.interestDomain', '==', userInterestDomain),
        limit(50)
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const memberList = snapshot.docs
            .map(doc => doc.data() as FormaAfriqueUser)
            .filter(member => member.uid !== user?.uid); // Exclude self
        setMembers(memberList);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching directory members:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [formaAfriqueUser, db, isProfileComplete, user?.uid]);


  const handleContact = async (contactId: string) => {
    if (!user || user.uid === contactId) return;

    if (!isProfileComplete) {
        toast({ variant: 'destructive', title: t('profile_incomplete_title'), description: t('profile_incomplete_desc_directory')});
        return;
    }

    const chatsRef = collection(db, 'chats');
    const sortedParticipants = [user.uid, contactId].sort();
    
    const q = query(chatsRef, where('participants', '==', sortedParticipants));
    
    try {
        const querySnapshot = await getDocs(q);
        let chatId: string | null = null;
        if (!querySnapshot.empty) {
            chatId = querySnapshot.docs[0].id;
        } else {
            const newChatRef = doc(collection(db, 'chats'));
            await setDoc(newChatRef, {
                participants: sortedParticipants,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastMessage: '',
            });
            chatId = newChatRef.id;
        }
        router.push(`/messages/${chatId}`);
    } catch(error: any) {
        toast({ variant: 'destructive', title: "Erreur", description: error.message.includes('permission-denied') ? t('chat_permission_denied') : "Impossible de démarrer la conversation." });
    }
  };

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!debouncedSearchTerm) return members;
    return members.filter(member =>
      member.username.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [members, debouncedSearchTerm]);


  return (
    <div className="space-y-8">
      <ProfileCompletionModal isOpen={!isProfileComplete} onGoToProfile={() => router.push('/account')} />
      <header>
        <h1 className="text-3xl font-bold">Annuaire des membres</h1>
        <p className="text-muted-foreground">Trouvez et connectez-vous avec d'autres apprenants de votre filière.</p>
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
            <Card key={i} className="p-4 bg-slate-800/50 border-slate-700">
              <Skeleton className="h-16 w-16 rounded-full mx-auto mb-3" />
              <Skeleton className="h-5 w-3/4 mx-auto mb-2" />
              <Skeleton className="h-3 w-1/2 mx-auto mb-3" />
              <Skeleton className="h-8 w-full" />
            </Card>
          ))
        ) : filteredMembers.length > 0 ? (
          filteredMembers.map(member => (
            <MemberCard key={member.uid} member={member} onContact={handleContact} />
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
