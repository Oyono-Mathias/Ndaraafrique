'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * @fileOverview Actions serveur pour la modération des conversations.
 * Permet aux admins de bloquer silencieusement des chats.
 */

export async function toggleChatBlock({
  chatId,
  adminId,
  shouldBlock
}: {
  chatId: string;
  adminId: string;
  shouldBlock: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const chatRef = db.collection('chats').doc(chatId);
    
    await chatRef.update({
      status: shouldBlock ? 'blocked' : 'active',
      blockedBy: shouldBlock ? adminId : FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Logger l'action dans la sécurité
    await db.collection('security_logs').add({
      eventType: shouldBlock ? 'chat_blocked' : 'chat_unblocked',
      userId: adminId,
      targetId: chatId,
      details: `Admin ${adminId} a ${shouldBlock ? 'bloqué' : 'débloqué'} la conversation ${chatId}.`,
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error toggling chat block:", error);
    return { success: false, error: error.message };
  }
}
