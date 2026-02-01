
'use client';
import { Suspense } from 'react';
import { ChatList } from '@/components/chat/ChatList';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { useSearchParams } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRole } from '@/context/RoleContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function MessagesPageContent() {
    const searchParams = useSearchParams();
    const { currentUser, isUserLoading } = useRole();
    const chatId = searchParams.get('chatId');
    const isMobile = useIsMobile();

    if (isUserLoading) {
        return null;
    }
    
    if (!currentUser?.isProfileComplete) {
         return (
             <div className="flex h-full flex-col items-center justify-center text-center text-slate-400 p-4">
                <MessageSquare className="h-20 w-20 mb-4 text-slate-500" />
                <h2 className="text-xl font-bold text-slate-200">Messagerie Privée</h2>
                <p className="max-w-md mt-2">Pour accéder à la messagerie et contacter d'autres membres, veuillez d'abord compléter votre profil.</p>
                <Button asChild className="mt-6">
                    <Link href="/account">Compléter mon profil</Link>
                </Button>
            </div>
         )
    }

    if (isMobile) {
        return chatId ? <ChatRoom chatId={chatId} /> : <ChatList selectedChatId={null} />;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] lg:grid-cols-[380px_1fr] h-[calc(100vh_-_theme(spacing.16))] -m-6">
            <div className="col-span-1 border-r border-slate-800">
                <ChatList selectedChatId={chatId} />
            </div>
            <div className="col-span-1">
                {chatId ? (
                    <ChatRoom chatId={chatId} />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-slate-400 p-4">
                        <MessageSquare className="h-20 w-20 mb-4 text-slate-500" />
                        <h2 className="text-xl font-bold text-slate-200">Bienvenue dans votre messagerie</h2>
                        <p>Sélectionnez une conversation pour commencer à discuter.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense>
            <MessagesPageContent />
        </Suspense>
    );
}
