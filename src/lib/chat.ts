
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  serverTimestamp,
  writeBatch,
  getDoc,
  DocumentData,
} from 'firebase/firestore';
import type { NdaraUser } from '@/lib/types';

/**
 * Démarre une nouvelle conversation ou retourne l'existante.
 * @param currentUserId - UID de l'initiateur
 * @param contactId - UID du destinataire
 * @returns L'ID du salon de discussion
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
  // On trie les IDs pour avoir une clé unique entre deux personnes
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

      const newChatRef = doc(collection(db, 'chats'));
      const batch = writeBatch(db);

      batch.set(newChatRef, {
        participants: sortedParticipants,
        participantCategories: [
          currentUserData.careerGoals?.interestDomain || '',
          contactUserData.careerGoals?.interestDomain || '',
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: 'Conversation démarrée.',
        lastSenderId: currentUserId,
        unreadBy: [contactId],
      });

      await batch.commit();
      return newChatRef.id;
    }
  } catch (error: any) {
    console.error("Error in startChat:", error);
    throw error;
  }
}
