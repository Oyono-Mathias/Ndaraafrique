
'use client';

/**
 * @fileOverview Messagerie centrale pour les administrateurs.
 * Permet de superviser et d'intervenir dans les discussions si nécessaire.
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatList } from '@/components/chat/ChatList';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { useRole } from '@/context/RoleContext';
import { Loader2, MessageSquare, ShieldCheck } from 'lucide-react';

function AdminMessagesContent() {
    const searchParams = useSearchParams();
    const { isUserLoading } = useRole();
    const chatId = searchParams.get('chatId');

    if (isUserLoading) {
        return (
            <div className="h-[70vh] flex items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Messagerie Centrale</h1>
                    <p className="text-slate-400">Surveillez et gérez les échanges communautaires.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] h-[75vh] border border-slate-800 rounded-3xl overflow-hidden bg-slate-900/20 shadow-2xl">
                <aside className="border-r border-slate-800 bg-slate-900/40">
                    <ChatList selectedChatId={chatId} />
                </aside>
                <main className="bg-slate-950 flex flex-col relative">
                    {chatId ? (
                        <ChatRoom chatId={chatId} />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-700 opacity-20 p-12 text-center animate-in fade-in duration-700">
                            <MessageSquare className="h-24 w-24 mb-6" />
                            <h2 className="text-2xl font-black uppercase tracking-[0.3em]">Centre de Contrôle</h2>
                            <p className="mt-2 text-sm font-medium tracking-tight">Sélectionnez une discussion pour lire ou intervenir.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default function AdminMessagesPage() {
    return (
        <Suspense fallback={
            <div className="h-[70vh] bg-slate-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <AdminMessagesContent />
        </Suspense>
    );
}
