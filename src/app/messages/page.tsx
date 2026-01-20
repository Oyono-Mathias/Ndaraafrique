'use client';

import { useRole } from '@/context/RoleContext';
import {
  collection,
  query,
  where,
  getFirestore,
  orderBy,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquareDashed, Search, Plus, UserX, Shield, Briefcase } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import type { NdaraUser, UserRole } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { toast } from '@/hooks/use-toast';
import { startChat } from '@/lib/chat';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';

// --- INTERFACES ---
interface Chat {
  id: string;
  participants: string[];
  participantDetails: Record<string, { username: string; profilePictureURL?: string; isOnline?: boolean, role: UserRole }>;
  lastMessage?: string;
  updatedAt?: any;
  lastSenderId?: string;
  unreadBy?: string[];
}

const ProfileCompletionModal = ({ isOpen, onGoToProfile }: { isOpen: boolean, onGoToProfile: () => void }) => {
    return (
        <Dialog open={isOpen}>
            <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader className="items-center text-center">
                    <div className="p-3 rounded-full bg-destructive/10 w-fit mb-2">
                        <UserX className="text-destructive h-6 w-6"/> 
                    </div>
                    <DialogTitle>Profil Incomplet</DialogTitle>
                    <DialogDescription className="pt-2">Pour accéder à la messagerie et à l'annuaire, veuillez d'abord compléter les informations essentielles de votre profil.</DialogDescription>
                </DialogHeader>
                <Button onClick={onGoToProfile} className="w-full">Compléter mon profil</Button>
            </DialogContent>
        </Dialog>
    );
};

const RoleBadge = ({ role }: { role: UserRole | undefined }) => {
  if (!role || role === 'student') return null;

  const roleInfo = {
      admin: {
          label: 'Admin',
          icon: Shield,
          className: 'bg-destructive/10 text-destructive border-destructive/30',
      },
      instructor: {
          label: 'Formateur',
          icon: Briefcase,
          className: 'bg-primary/10 text-primary border-primary/30',
      },
      student: {}
  };
  
  const currentRole = roleInfo[role];
  if (!currentRole.label) return null;
  
  const { label, icon: Icon, className } = currentRole;

  return (
      <Badge className={cn('ml-2 capitalize text-xs font-semibold', className)}>
          <Icon className="h-3 w-3 mr-1"/>
          {label}
      </Badge>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function MessagesPage() {
  const { user, currentUser, isUserLoading } = useRole();
  const pathname = usePathname();
  const db = getFirestore();
  const router = useRouter();
  const isMobile = useIsMobile();
  
  const [chatList, setChatList] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [allStudents, setAllStudents] = useState<NdaraUser[]>([]);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  
  const isProfileComplete = useMemo(() => !!(currentUser?.username && currentUser?.careerGoals?.interestDomain), [currentUser]);

  const activeChatId = useMemo(() => {
      const pathParts = pathname.split('/messages/');
      return pathParts.length > 1 ? pathParts[1] : null;
  }, [pathname]);

  useEffect(() => {
    if (!user?.uid) {
      if (!isUserLoading) setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid), orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const chatsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const participantIds = [...new Set(chatsData.flatMap(chat => chat.participants))];
        const otherParticipantIds = participantIds.filter(id => id !== user.uid);

        const usersMap = new Map<string, NdaraUser>();
        if (otherParticipantIds.length > 0) {
            const chunks: string[][] = [];
            for (let i = 0; i < otherParticipantIds.length; i += 30) {
                chunks.push(otherParticipantIds.slice(i, i + 30));
            }
            for (const chunk of chunks) {
                const usersQuery = query(collection(db, 'users'), where('uid', 'in', chunk));
                const usersSnap = await getDocs(usersQuery);
                usersSnap.forEach(doc => usersMap.set(doc.id, doc.data() as NdaraUser));
            }
        }

        const populatedChats: Chat[] = chatsData.map(chat => {
            const participantDetails: Chat['participantDetails'] = {};
            chat.participants.forEach((pId: string) => {
                if (pId !== user.uid) {
                    const userData = usersMap.get(pId);
                    participantDetails[pId] = {
                        username: userData?.username || 'Utilisateur',
                        profilePictureURL: userData?.profilePictureURL,
                        isOnline: userData?.isOnline,
                        role: userData?.role || 'student',
                    };
                }
            });
            return { ...chat, id: chat.id, participantDetails } as Chat;
        });
        
        setChatList(populatedChats);
        setIsLoading(false);

        if (!isMobile && !activeChatId && populatedChats.length > 0) {
            router.replace(`/messages/${populatedChats[0].id}`, { scroll: false });
        }
    });

    return () => unsubscribe();
  }, [user, isUserLoading, db, isMobile, activeChatId, router]);
  
  const handleStartChat = useCallback(async (studentId: string) => {
    if (!user) return;
    setIsCreatingChat(true);
    try {
        const chatId = await startChat(user.uid, studentId);
        setIsNewChatModalOpen(false);
        router.push(`/messages/${chatId}`);
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } finally {
        setIsCreatingChat(false);
    }
  }, [user, router, toast]);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const filteredChatList = useMemo(() => {
    if (!debouncedSearchTerm) return chatList;
    return chatList.filter(chat => {
        const otherId = chat.participants.find(p => p !== user?.uid);
        const otherUsername = otherId ? chat.participantDetails[otherId]?.username : '';
        return otherUsername.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    });
  }, [chatList, user, debouncedSearchTerm]);

  
  const filteredStudents = useMemo(() => {
      return allStudents.filter(student => student.username.toLowerCase().includes(modalSearchTerm.toLowerCase()));
  }, [allStudents, modalSearchTerm, currentUser]);

  const handleConversationSelect = (chatId: string) => {
    if (isMobile) {
        router.push(`/messages/${chatId}`);
    } else {
        router.replace(`/messages/${chatId}`, { scroll: false });
    }
  };

  const mainContent = (
    <div className={cn(
        "grid h-full",
        isMobile ? "grid-cols-1" : "md:grid-cols-[340px_1fr] lg:grid-cols-[400px_1fr]"
    )}>
        <div className={cn(
            "flex flex-col h-full bg-slate-900 border-r border-slate-800",
            isMobile && activeChatId && "hidden" // Hide list on mobile when chat is open
        )}>
             <div className="p-4 border-b border-slate-800">
                <h1 className="font-bold text-xl text-white">Messagerie</h1>
                 <div className="relative pt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Rechercher une conversation..."
                        className="pl-10 h-9 rounded-full bg-slate-800 border-slate-700 text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <ScrollArea className="flex-1">
                 {filteredChatList.length > 0 ? (
                    <div className="space-y-0">
                        {filteredChatList.map(chat => {
                            const otherId = chat.participants.find(p => p !== user?.uid);
                            const other = otherId ? chat.participantDetails[otherId] : null;
                            const isUnread = chat.unreadBy?.includes(user?.uid || '');
                            const isActive = activeChatId === chat.id;

                            return (
                                <button
                                    key={chat.id}
                                    onClick={() => handleConversationSelect(chat.id)}
                                    className={cn(
                                        "w-full text-left p-3 flex items-center gap-4 transition-all border-b border-slate-800",
                                        isActive && !isMobile ? "bg-primary/10" : "hover:bg-slate-800/50"
                                    )}
                                >
                                    <div className="relative">
                                        <Avatar className="h-12 w-12 border-2 border-slate-700">
                                            <AvatarImage src={other?.profilePictureURL} alt={other?.username}/>
                                            <AvatarFallback className="bg-slate-700 text-slate-300">{other?.username?.charAt(0) || '?'}</AvatarFallback>
                                        </Avatar>
                                        {other?.isOnline && <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-slate-900" />}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex items-center">
                                            <p className={cn("truncate text-sm text-slate-200", isUnread ? "font-bold" : "font-semibold")}>
                                              {other?.username || "Utilisateur"}
                                            </p>
                                            <RoleBadge role={other?.role} />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className={cn("text-sm truncate leading-relaxed", isUnread ? "font-medium text-slate-300" : "text-slate-400")}>
                                                {isUnread && chat.lastSenderId !== user?.uid ? <span className="font-bold">Nouveau message: </span> : null}
                                                {chat.lastMessage || "Cliquez pour lire les messages"}
                                            </p>
                                            {isUnread && <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0"></div>}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-500 h-full flex flex-col justify-center items-center">
                        <MessageSquareDashed className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <h3 className="font-semibold text-lg">Aucune conversation</h3>
                    </div>
                )}
            </ScrollArea>
        </div>

        <div className={cn("h-full", isMobile && !activeChatId && "hidden")}>
            {activeChatId ? <ChatRoom chatId={activeChatId} /> : (
                <div className="hidden md:flex h-full flex-col items-center justify-center bg-slate-900 text-slate-500">
                    <MessageSquareDashed className="h-16 w-16 mb-4" />
                    <p>Sélectionnez une conversation</p>
                </div>
            )}
        </div>
    </div>
  );

  return (
    <>
      <ProfileCompletionModal isOpen={!isUserLoading && !!user && !isProfileComplete} onGoToProfile={() => router.push('/account')} />
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] lg:grid-cols-[400px_1fr] h-full">
           <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
               <div className="p-4 border-b border-slate-800 space-y-2">
                  <Skeleton className="h-8 w-1/2"/>
                  <Skeleton className="h-9 w-full rounded-full"/>
               </div>
               <div className="p-3 space-y-2">
                   <Skeleton className="h-16 w-full"/>
                   <Skeleton className="h-16 w-full"/>
                   <Skeleton className="h-16 w-full"/>
               </div>
           </div>
            <div className="hidden md:flex h-full flex-col items-center justify-center bg-slate-900 text-slate-500">
               <MessageSquareDashed className="h-16 w-16 mb-4" />
               <p>Sélectionnez une conversation pour commencer</p>
           </div>
        </div>
      ) : (isProfileComplete ? mainContent : null)}
    </>
  );
}
