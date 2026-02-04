
'use client';

/**
 * @fileOverview Messagerie Privée Ndara Afrique.
 * Supporte le mode liste sur mobile et le mode split sur desktop.
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatList } from '@/components/chat/ChatList';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRole } from '@/context/RoleContext';
import { Loader2, MessageSquare } from 'lucide-react';

function MessagesPageContent() {
    const searchParams = useSearchParams();
    const { currentUser, isUserLoading } = useRole();
    const chatId = searchParams.get('chatId');
    const isMobile = useIsMobile();

    if (isUserLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isMobile) {
        return chatId ? <ChatRoom chatId={chatId} /> : <ChatList selectedChatId={null} />;
    }

    return (
        <div className="grid grid-cols-[350px_1fr] h-[calc(100vh-64px)] -m-6 overflow-hidden">
            <aside className="border-r border-slate-800">
                <ChatList selectedChatId={chatId} />
            </aside>
            <main className="bg-slate-950 flex flex-col">
                {chatId ? (
                    <ChatRoom chatId={chatId} />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-700 opacity-20 p-12 text-center">
                        <MessageSquare className="h-24 w-24 mb-6" />
                        <h2 className="text-2xl font-black uppercase tracking-[0.3em]">Messagerie</h2>
                        <p className="mt-2 text-sm">Sélectionnez une conversation pour démarrer.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={<div className="h-full bg-slate-950" />}>
            <MessagesPageContent />
        </Suspense>
    );
}
