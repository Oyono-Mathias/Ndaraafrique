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

/**
 * Starts a new chat between two users or returns the existing one.
 * Runs on the client side.
 * @param currentUserId - The UID of the user initiating the chat.
 * @param contactId - The UID of the user to chat with.
 * @returns The ID of the chat room.
 */
export async function startChat(
  currentUserId: string,
  contactId: string,
): Promise<string> {
  const db = getFirestore();
  
  if (currentUserId === contactId) {
    throw new Error("Impossible de démarrer une conversation avec soi-même.");
  }

  const chatsRef = collection(db, 'chats');
  const sortedParticipants = [currentUserId, contactId].sort();

  const q = query(chatsRef, where('participants', '==', sortedParticipants));

  try {
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    } else {
      const [currentUserDoc, contactUserDoc] = await Promise.all([
        getDoc(doc(db, 'users', currentUserId)),
        getDoc(doc(db, 'users', contactId)),
      ]);

      if (!currentUserDoc.exists() || !contactUserDoc.exists()) {
        throw new Error("Un des utilisateurs n'existe pas.");
      }

      const currentUserData = currentUserDoc.data() as NdaraUser;
      const contactUserData = contactUserDoc.data() as NdaraUser;

      const isAdminInitiated = currentUserData.role === 'admin';

      // Allow chat if domains match OR if an admin is involved
      if (!isAdminInitiated && currentUserData.careerGoals?.interestDomain !== contactUserData.careerGoals?.interestDomain) {
         throw new Error("Vous ne pouvez discuter qu'avec les membres de votre filière.");
      }

      const newChatRef = doc(collection(db, 'chats'));
      const batch = writeBatch(db);

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
        unreadBy: [],
      });

      await batch.commit();
      return newChatRef.id;
    }
  } catch (error: any) {
    console.error("Error in startChat function: ", error);
    // Re-throw a more user-friendly error
    if (error.message.includes('permission-denied') || error.message.includes('permission denied')) {
        throw new Error("Permission refusée. Vos règles de sécurité Firestore empêchent cette action.");
    }
    throw error;
  }
}
