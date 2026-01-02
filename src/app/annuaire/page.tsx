
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
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
import { Search, MessageSquare, Users } from 'lucide-react';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { useDebounce } from '@/hooks/use-debounce';

const MemberCard = ({ member, onContact }: { member: FormaAfriqueUser; onContact: (memberId: string) => void; }) => {
  return (
    <Card className="text-center p-4 bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-shadow">
      <Avatar className="mx-auto h-16 w-16 mb-3 border-2 border-primary/20">
        <AvatarImage src={member.profilePictureURL} />
        <AvatarFallback className="text-xl bg-slate-100 text-primary font-semibold">
          {member.fullName?.charAt(0) || '?'}
        </AvatarFallback>
      </Avatar>
      <h3 className="font-bold text-sm text-slate-800 truncate">{member.fullName}</h3>
      <p className="text-xs text-slate-500 mb-3 truncate">{member.careerGoals?.interestDomain || 'Apprenant'}</p>
      <Button size="sm" onClick={() => onContact(member.uid)} className="bg-primary hover:bg-primary/90 text-xs h-8">
        <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
        Contacter
      </Button>
    </Card>
  );
};

export default function DirectoryPage() {
  const { user } = useRole();
  const db = getFirestore();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const usersQuery = useMemoFirebase(() => {
    const baseQuery = query(
        collection(db, 'users'),
        where('role', '==', 'student'),
        limit(20)
    );
    return baseQuery;
  }, [db]);

  const { data: members, isLoading } = useCollection<FormaAfriqueUser>(usersQuery);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!debouncedSearchTerm) return members;
    return members.filter(member =>
      member.fullName.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [members, debouncedSearchTerm]);
  
  const handleContact = async (contactId: string) => {
    if (!user || user.uid === contactId) return;

    const chatsRef = collection(db, 'chats');
    const sortedParticipants = [user.uid, contactId].sort();
    
    // Check if a chat already exists
    const q = query(chatsRef, where('participants', '==', sortedParticipants));
    const querySnapshot = await getDocs(q);

    let chatId: string | null = null;
    if (!querySnapshot.empty) {
        chatId = querySnapshot.docs[0].id;
    } else {
        // Create a new chat
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
  };


  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Annuaire des membres</h1>
        <p className="text-muted-foreground">Trouvez et connectez-vous avec d'autres apprenants.</p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Rechercher par nom..."
          className="pl-10 max-w-sm bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {isLoading ? (
          [...Array(10)].map((_, i) => (
            <Card key={i} className="p-4">
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
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-lg">
            <Users className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-semibold text-slate-600">Aucun membre trouvé</h3>
            <p className="mt-1 text-sm text-slate-500">
              {debouncedSearchTerm
                ? `Aucun résultat pour "${debouncedSearchTerm}". Essayez un autre nom.`
                : "L'annuaire est actuellement vide."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
