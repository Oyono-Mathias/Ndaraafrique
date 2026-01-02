
'use client';

import { useParams } from 'next/navigation';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { Card, CardContent } from '@/components/ui/card';

export default function ChatConversationPage() {
  const params = useParams();
  const chatId = params.chatId as string;

  return (
    <div className="h-[calc(100vh_-_theme(spacing.24))] -m-6">
      <Card className="h-full w-full border-0 rounded-none shadow-none">
        <CardContent className="p-0 h-full">
            {chatId ? <ChatRoom chatId={chatId} /> : <div>Chargement...</div>}
        </CardContent>
      </Card>
    </div>
  );
}
