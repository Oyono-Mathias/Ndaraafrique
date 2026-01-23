
'use client';
import { Suspense } from 'react';
import { ChatList } from '@/components/chat/ChatList';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { useSearchParams } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

function MessagesPageContent() {
    const searchParams = useSearchParams();
    const chatId = searchParams.get('chatId');
    const isMobile = useIsMobile();

    if (isMobile) {
        return chatId ? <ChatRoom chatId={chatId} /> : <ChatList selectedChatId={null} />;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-[calc(100vh_-_theme(spacing.16))] -m-6">
            <div className="col-span-1 border-r border-slate-800">
                <ChatList selectedChatId={chatId} />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
                {chatId ? (
                    <ChatRoom chatId={chatId} />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                        <MessageSquare className="h-20 w-20 mb-4" />
                        <h2 className="text-xl font-bold text-slate-300">Bienvenue dans votre messagerie</h2>
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
