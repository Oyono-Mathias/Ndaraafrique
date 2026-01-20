'use server';

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  writeBatch,
  getDoc,
  DocumentData,
  Firestore,
} from 'firebase/firestore';
import type { NdaraUser } from '@/lib/types';
import { adminDb } from '@/firebase/admin';

/**
 * Starts a new chat between two users or returns the existing one.
 * @param currentUserId - The UID of the user initiating the chat.
 * @param contactId - The UID of the user to chat with.
 * @returns The ID of the chat room.
 */
export async function startChat(
  currentUserId: string,
  contactId: string,
): Promise<string> {
  if (!adminDb) {
    throw new Error("La messagerie est temporairement indisponible.");
  }
  
  if (currentUserId === contactId) {
    throw new Error("Impossible de démarrer une conversation avec soi-même.");
  }

  const db = adminDb;
  const chatsRef = db.collection('chats');
  const sortedParticipants = [currentUserId, contactId].sort();

  // Query to find if a chat already exists between these two users
  const q = chatsRef.where('participants', '==', sortedParticipants);

  try {
    const querySnapshot = await q.get();

    if (!querySnapshot.empty) {
      // Chat already exists, return its ID
      return querySnapshot.docs[0].id;
    } else {
      // Chat doesn't exist, create a new one
      const [currentUserDoc, contactUserDoc] = await Promise.all([
        db.collection('users').doc(currentUserId).get(),
        db.collection('users').doc(contactId).get(),
      ]);

      if (!currentUserDoc.exists || !contactUserDoc.exists) {
        throw new Error("Un des utilisateurs n'existe pas.");
      }

      const currentUserData = currentUserDoc.data() as NdaraUser;
      const contactUserData = contactUserDoc.data() as NdaraUser;

      const isAdminInitiated = currentUserData.role === 'admin';

      // Allow chat if domains match OR if an admin is involved
      if (!isAdminInitiated && currentUserData.careerGoals?.interestDomain !== contactUserData.careerGoals?.interestDomain) {
         throw new Error("Vous ne pouvez discuter qu'avec les membres de votre filière.");
      }

      const newChatRef = db.collection('chats').doc();
      const batch = db.batch();

      batch.set(newChatRef, {
        participants: sortedParticipants,
        participantCategories: [
          currentUserData.careerGoals?.interestDomain || '',
          contactUserData.careerGoals?.interestDomain || '',
        ],
        isAdminChat: isAdminInitiated,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: 'Conversation démarrée.',
        unreadBy: [], // Initialize unreadBy as an empty array
      });

      await batch.commit();
      return newChatRef.id;
    }
  } catch (error: any) {
    console.error("Error in startChat function: ", error);
    // Re-throw a more user-friendly error
    if (error.message.includes('permission-denied')) {
        throw new Error("Permission refusée. Vérifiez vos règles de sécurité Firestore.");
    }
    throw error;
  }
}
