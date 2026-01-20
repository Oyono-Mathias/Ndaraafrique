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
  setDoc,
  doc,
  serverTimestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquareDashed, Search, Plus, UserX, Shield, Briefcase, User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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

  const activeChatIdFromUrl = pathname.split('/messages/')[1];
  const [activeChatId, setActiveChatId] = useState<string | null>(activeChatIdFromUrl);

  useEffect(() => {
    setActiveChatId(activeChatIdFromUrl);
  }, [activeChatIdFromUrl]);

  useEffect(() => {
    if (!user?.uid) {
      if (!isUserLoading) setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    // This is a placeholder as data logic is not implemented yet.
    // In a real scenario, this is where you'd fetch chat data.
    setTimeout(() => {
        // Static data for UI design
        const fakeChatList = [
            {
                id: '1', participants: ['user1', 'user2'], lastMessage: "Salut ! Comment ça va ? J'ai une question sur le cours...",
                updatedAt: new Date(), lastSenderId: 'user2', unreadBy: [user.uid],
                participantDetails: { user2: { username: 'Amina Diallo', profilePictureURL: '/placeholder-avatars/amina.jpg', isOnline: true, role: 'student' } }
            },
            {
                id: '2', participants: ['user1', 'user3'], lastMessage: "Merci beaucoup, c'était très clair !",
                updatedAt: new Date(Date.now() - 3600000), lastSenderId: 'user1', unreadBy: [],
                participantDetails: { user3: { username: 'Kwame Nkrumah', profilePictureURL: '/placeholder-avatars/kwame.jpg', isOnline: false, role: 'instructor' } }
            },
        ];
        // @ts-ignore
        setChatList(fakeChatList);
        if (!isMobile && !activeChatId && fakeChatList.length > 0) {
          const firstChatId = fakeChatList[0].id;
          setActiveChatId(firstChatId);
          router.replace(`/messages/${firstChatId}`, { scroll: false });
        }
        setIsLoading(false);
    }, 1500);

  }, [user?.uid, db, isUserLoading, isMobile, activeChatId, router]);
  
  const handleStartChat = useCallback(async (studentId: string) => {
    if (!user) return;
    setIsCreatingChat(true);
    // Placeholder logic
    toast({ title: 'Démarrage de la discussion...' });
    setTimeout(() => {
        setIsCreatingChat(false);
        setIsNewChatModalOpen(false);
    }, 1000);
  }, [user, router, isMobile, toast]);

  const filteredChatList = useMemo(() => chatList, [chatList, user, searchTerm]);

  
  const filteredStudents = useMemo(() => {
      return allStudents.filter(student => student.username.toLowerCase().includes(modalSearchTerm.toLowerCase()));
  }, [allStudents, modalSearchTerm, currentUser]);

  const handleConversationSelect = (chatId: string) => {
    setActiveChatId(chatId);
    router.replace(`/messages/${chatId}`, { scroll: false });
  };

  if (isLoading) {
    return (
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
    );
  }
  
  if (!isMobile) {
    return (
        <>
        <ProfileCompletionModal isOpen={false} onGoToProfile={() => router.push('/account')} />
        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] lg:grid-cols-[400px_1fr] h-full">
            <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
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
                                            isActive ? "bg-primary/10" : "hover:bg-slate-800/50"
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
                <div className="p-2 border-t border-slate-800">
                    <Button variant="ghost" className="w-full" onClick={() => setIsNewChatModalOpen(true)} disabled={!isProfileComplete}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nouvelle discussion
                    </Button>
                </div>
            </div>

            <div className="h-full">
                {activeChatId ? <ChatRoom chatId={activeChatId} /> : (
                    <div className="h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                        <MessageSquareDashed className="h-16 w-16 mb-4" />
                        <p>Sélectionnez une conversation</p>
                    </div>
                )}
            </div>
             <Dialog open={isNewChatModalOpen} onOpenChange={setIsNewChatModalOpen}>
              <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
                  <DialogHeader>
                      <DialogTitle>Démarrer une nouvelle discussion</DialogTitle>
                      <DialogDescription>Sélectionnez un étudiant avec qui discuter.</DialogDescription>
                  </DialogHeader>
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                          placeholder="Rechercher un étudiant..." 
                          className="pl-10 dark:bg-slate-800 dark:border-slate-700" 
                          value={modalSearchTerm}
                          onChange={e => setModalSearchTerm(e.target.value)}
                      />
                  </div>
                  <ScrollArea className="h-72">
                      <div className="space-y-1 pr-4">
                          {filteredStudents.map(student => (
                              <button key={student.uid} onClick={() => handleStartChat(student.uid)} disabled={isCreatingChat} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 disabled:opacity-50">
                                  <Avatar className="h-9 w-9">
                                      <AvatarImage src={student.profilePictureURL} />
                                      <AvatarFallback>{student.username.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-sm">@{student.username}</span>
                              </button>
                          ))}
                      </div>
                  </ScrollArea>
              </DialogContent>
            </Dialog>
        </div>
        </>
    );
  }

  // Mobile view: Only show the list. Navigation to a chat will render ChatRoom in a separate page.
  return (
    <>
    <ProfileCompletionModal isOpen={false} onGoToProfile={() => router.push('/account')} />
    <Card className="dark:bg-slate-900 dark:border-slate-800 flex flex-col h-full">
        <CardHeader className="border-b dark:border-slate-800">
            <CardTitle className="dark:text-white">Messagerie</CardTitle>
             <div className="relative pt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Rechercher une conversation..."
                    className="pl-10 h-9 rounded-full bg-slate-800 border-slate-700 text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent className="p-0 flex-1">
             <ScrollArea className="h-full">
                {filteredChatList.length > 0 ? (
                    <div className="space-y-0">
                        {filteredChatList.map(chat => {
                            const otherId = chat.participants.find(p => p !== user?.uid);
                            const other = otherId ? chat.participantDetails[otherId] : null;
                            const isUnread = chat.unreadBy?.includes(user?.uid || '');
                            
                            return (
                                <Link
                                    key={chat.id}
                                    href={isProfileComplete ? `/messages/${chat.id}` : '#'}
                                    onClick={(e) => !isProfileComplete && e.preventDefault()}
                                    className={cn(
                                        "block p-3 flex items-center gap-4 transition-all border-b dark:border-slate-800 hover:bg-slate-800/50"
                                    )}
                                >
                                    <div className="relative">
                                      <Avatar className="h-12 w-12 border-2 dark:border-slate-700">
                                          <AvatarImage src={other?.profilePictureURL} alt={other?.username}/>
                                          <AvatarFallback className="dark:bg-slate-700 dark:text-slate-300">{other?.username?.charAt(0) || '?'}</AvatarFallback>
                                      </Avatar>
                                      {other?.isOnline && <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-slate-900" />}
                                    </div>

                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex items-center">
                                            <p className={cn("truncate text-sm dark:text-slate-200", isUnread ? "font-bold" : "font-semibold")}>
                                              {other?.username || "Utilisateur"}
                                            </p>
                                            <RoleBadge role={other?.role} />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className={cn("text-sm truncate leading-relaxed", isUnread ? "font-medium text-slate-300" : "text-slate-400")}>
                                                {isUnread && chat.lastSenderId !== user?.uid ? <span className="font-bold">Nouveau: </span> : null}
                                                {chat.lastMessage || "Cliquez pour lire les messages"}
                                            </p>
                                            {isUnread && <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0"></div>}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-500 h-full flex flex-col justify-center items-center">
                        <MessageSquareDashed className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <h3 className="font-semibold text-lg">Aucune conversation</h3>
                        <p className="text-sm">Démarrez une nouvelle discussion pour commencer.</p>
                    </div>
                )}
            </ScrollArea>
        </CardContent>
    </Card>
    
    <Dialog open={isNewChatModalOpen} onOpenChange={setIsNewChatModalOpen}>
        <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
            <DialogHeader>
                <DialogTitle>Démarrer une nouvelle discussion</DialogTitle>
                <DialogDescription>Sélectionnez un étudiant avec qui discuter.</DialogDescription>
            </DialogHeader>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Rechercher un étudiant..." 
                    className="pl-10 dark:bg-slate-800 dark:border-slate-700" 
                    value={modalSearchTerm}
                    onChange={e => setModalSearchTerm(e.target.value)}
                />
            </div>
            <ScrollArea className="h-72">
                <div className="space-y-1 pr-4">
                    {filteredStudents.map(student => (
                        <button key={student.uid} onClick={() => handleStartChat(student.uid)} disabled={isCreatingChat} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 disabled:opacity-50">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={student.profilePictureURL} />
                                <AvatarFallback>{student.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">@{student.username}</span>
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </DialogContent>
    </Dialog>

    <Button onClick={() => setIsNewChatModalOpen(true)} disabled={!isProfileComplete} className="fixed bottom-24 right-6 h-16 w-16 rounded-full shadow-lg z-50 flex items-center justify-center">
        <Plus className="h-8 w-8" />
        <span className="sr-only">Nouveau Message</span>
    </Button>
    </>
  );
}
