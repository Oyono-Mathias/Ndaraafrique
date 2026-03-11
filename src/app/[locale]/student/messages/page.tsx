'use client';

/**
 * @fileOverview Point d'entrée de la messagerie Ndara Afrique.
 * Gère l'affichage dynamique Liste vs Conversation pour un usage optimal sur smartphone.
 * ✅ ANDROID-FIRST : Un seul panneau actif sur mobile.
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatList } from '@/components/chat/ChatList';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRole } from '@/context/RoleContext';
import { Loader2 } from 'lucide-react';

function MessagesPageContent() {
    const searchParams = useSearchParams();
    const { isUserLoading } = useRole();
    const chatId = searchParams.get('chatId');
    const isMobile = useIsMobile();

    if (isUserLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // SUR MOBILE : On affiche soit la liste, soit la salle, jamais les deux.
    if (isMobile) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-950 overflow-hidden">
                {chatId ? <ChatRoom chatId={chatId} /> : <ChatList selectedChatId={null} />}
            </div>
        );
    }

    // SUR DESKTOP : Layout Split-Screen standard.
    return (
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] h-[calc(100vh-64px)] -m-6 overflow-hidden">
            <aside className="border-r border-slate-800 bg-slate-900/20">
                <ChatList selectedChatId={chatId} />
            </aside>
            <main className="bg-slate-950 flex flex-col relative">
                {chatId ? (
                    <ChatRoom chatId={chatId} />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-700 opacity-20 p-12 text-center animate-in fade-in duration-700">
                        <div className="p-8 bg-slate-900/50 rounded-full mb-6">
                            <svg className="h-24 w-24 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-[0.3em]">Messagerie</h2>
                        <p className="mt-2 text-sm font-medium tracking-tight">Sélectionnez une discussion pour démarrer.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={
            <div className="h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <MessagesPageContent />
        </Suspense>
    );
}
