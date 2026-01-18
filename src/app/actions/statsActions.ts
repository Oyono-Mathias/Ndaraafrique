'use server';

import { adminDb } from '@/firebase/admin';

export async function getPublicStats() {
  try {
    // This is more performant than getting all documents
    const usersCollection = adminDb.collection('users');
    const studentQuery = usersCollection.where('role', '==', 'student');
    const instructorQuery = usersCollection.where('role', '==', 'instructor');

    const [studentSnapshot, instructorSnapshot] = await Promise.all([
      studentQuery.count().get(),
      instructorQuery.count().get()
    ]);
    
    const studentCount = studentSnapshot.data().count;
    const instructorCount = instructorSnapshot.data().count;

    return {
      success: true,
      data: {
        studentCount,
        instructorCount,
      },
    };
  } catch (error) {
    console.error("Error fetching public stats:", error);
    return { success: false, error: "Impossible de récupérer les statistiques." };
  }
}
