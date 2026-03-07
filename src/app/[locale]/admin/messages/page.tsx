'use client';

/**
 * @fileOverview Messagerie centrale pour les administrateurs.
 * Permet de superviser et d'intervenir dans les discussions si nécessaire.
 * ✅ SÉCURITÉ : Blocage silencieux des conversations suspectes.
 */

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, onSnapshot, getDocs, where } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Loader2, MessageSquare, ShieldCheck, ShieldAlert, Ban, CheckCircle2, Search, ArrowLeft, Trash2 } from 'lucide-react';
import { ChatList } from '@/components/chat/ChatList';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { toggleChatBlock } from '@/actions/chatActions';
import { cn } from '@/lib/utils';

function AdminMessagesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { currentUser, isUserLoading } = useRole();
    const { toast } = useToast();
    const chatId = searchParams.get('chatId');
    const [isActionPending, setIsActionLoading] = useState(false);

    // Écouter le chat sélectionné pour son statut
    const [selectedChatStatus, setSelectedChatStatus] = useState<'active' | 'blocked' | null>(null);
    const db = getFirestore();

    useMemo(() => {
        if (!chatId) return;
        const unsub = onSnapshot(doc(db, 'chats', chatId), (snap) => {
            if (snap.exists()) {
                setSelectedChatStatus(snap.data().status || 'active');
            }
        });
        return () => unsub();
    }, [chatId, db]);

    const handleToggleBlock = async () => {
        if (!chatId || !currentUser || isActionPending) return;
        setIsActionLoading(true);
        const shouldBlock = selectedChatStatus !== 'blocked';
        const result = await toggleChatBlock({
            chatId,
            adminId: currentUser.uid,
            shouldBlock
        });

        if (result.success) {
            toast({ 
                title: shouldBlock ? "Conversation gelée" : "Conversation rétablie",
                description: shouldBlock ? "Les messages ne seront plus distribués." : "Le flux normal est restauré."
            });
        } else {
            toast({ variant: 'destructive', title: "Erreur", description: result.error });
        }
        setIsActionLoading(false);
    };

    if (isUserLoading) {
        return (
            <div className="h-[70vh] flex items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Messagerie Centrale</h1>
                        <p className="text-slate-400">Surveillez et gérez les échanges communautaires Ndara Afrique.</p>
                    </div>
                </div>

                {chatId && (
                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={handleToggleBlock}
                            disabled={isActionPending}
                            variant={selectedChatStatus === 'blocked' ? "default" : "outline"}
                            className={cn(
                                "h-11 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all",
                                selectedChatStatus === 'blocked' ? "bg-emerald-500 hover:bg-emerald-600 text-white border-none" : "border-red-500/30 text-red-500 hover:bg-red-500/10"
                            )}
                        >
                            {isActionPending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : selectedChatStatus === 'blocked' ? <CheckCircle2 className="h-4 w-4 mr-2"/> : <Ban className="h-4 w-4 mr-2"/>}
                            {selectedChatStatus === 'blocked' ? "Rétablir la discussion" : "Geler (Blocage Silencieux)"}
                        </Button>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] h-[75vh] border border-slate-800 rounded-[2.5rem] overflow-hidden bg-slate-900/20 shadow-2xl">
                <aside className="border-r border-slate-800 bg-slate-900/40">
                    <ChatList selectedChatId={chatId} />
                </aside>
                <main className="bg-slate-950 flex flex-col relative">
                    {chatId ? (
                        <ChatRoom chatId={chatId} />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-700 opacity-20 p-12 text-center animate-in fade-in duration-700">
                            <MessageSquare className="h-24 w-24 mb-6" />
                            <h2 className="text-2xl font-black uppercase tracking-[0.3em]">Centre de Surveillance</h2>
                            <p className="mt-2 text-sm font-medium tracking-tight">Sélectionnez une discussion pour lire ou intervenir silensieusement.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

import { doc } from 'firebase/firestore';

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
