'use client';

import { useParams } from 'next/navigation';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { useIsMobile } from '@/hooks/use-mobile';
import MessagesPage from '../page';

export default function ChatConversationPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  const isMobile = useIsMobile();

  // On Desktop, the main MessagesPage handles the rendering.
  // We re-render the parent page to keep the URL in sync and let it handle the layout.
  if (!isMobile) {
     return <MessagesPage />;
  }

  // On Mobile, this page takes over to show the chat in full screen.
  return (
      <div className="h-full w-full">
          {chatId ? <ChatRoom chatId={chatId} /> : <div>Chargement...</div>}
      </div>
  );
}
