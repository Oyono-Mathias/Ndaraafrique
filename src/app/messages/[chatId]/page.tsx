'use client';

import { useParams } from 'next/navigation';
import { ChatRoom } from '@/components/chat/ChatRoom';

export default function ChatConversationPage() {
  const params = useParams();
  const chatId = params.chatId as string;

  // The parent div is now simplified. The ChatRoom component will control its own layout.
  // The negative margins and complex height calculations from AppShell are handled internally.
  return (
      <div className="h-full w-full">
          {chatId ? <ChatRoom chatId={chatId} /> : <div>Chargement...</div>}
      </div>
  );
}
