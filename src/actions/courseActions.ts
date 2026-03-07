'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Course, NdaraUser, Settings } from '@/lib/types';

/**
 * Soumettre une demande de rachat de cours par la plateforme.
 * Vérifie rigoureusement les conditions CEO avant enregistrement.
 */
export async function requestCourseBuyoutAction({
  courseId,
  instructorId,
  requestedPrice,
}: {
  courseId: string;
  instructorId: string;
  requestedPrice: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    
    // 0. Vérification de l'activation globale de l'option
    const settingsSnap = await db.collection('settings').doc('global').get();
    const settingsData = settingsSnap.data() as Settings;
    if (settingsData?.platform?.allowCourseBuyout === false) {
        return { success: false, error: 'Le programme de rachat est actuellement suspendu par la direction.' };
    }

    // 1. Vérification du cours
    const courseRef = db.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();
    if (!courseDoc.exists) return { success: false, error: 'Cours introuvable.' };
    
    const courseData = courseDoc.data() as Course;
    if (courseData.instructorId !== instructorId) return { success: false, error: 'Permission refusée.' };
    if (courseData.status !== 'Published') return { success: false, error: 'Seule une formation publiée peut être rachetée.' };

    // 2. Vérification de l'instructeur (Sanctions et Profil)
    const userDoc = await db.collection('users').doc(instructorId).get();
    const userData = userDoc.data() as NdaraUser;
    
    if (userData.buyoutSanctions?.isSanctioned) {
        return { success: false, error: 'Votre compte est restreint pour violation des règles de rachat.' };
    }
    if (!userData.isProfileComplete) {
        return { success: false, error: 'Votre profil doit être 100% complété (Photo, Bio, Expertise).' };
    }

    // 3. Vérification du volume de contenu (Server-side enforcement)
    const sectionsSnap = await courseRef.collection('sections').get();
    if (sectionsSnap.size < 2) {
        return { success: false, error: 'Contenu insuffisant : Minimum 2 sections requises.' };
    }

    let lectureCount = 0;
    for (const sec of sectionsSnap.docs) {
        const lecturesSnap = await sec.ref.collection('lectures').get();
        lectureCount += lecturesSnap.size;
    }

    if (lectureCount < 5) {
        return { success: false, error: 'Contenu insuffisant : Minimum 5 leçons requises.' };
    }

    // 4. Mise à jour de la demande
    await courseRef.update({
      buyoutStatus: 'requested',
      buyoutPrice: requestedPrice,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 5. Journalisation audit
    await db.collection('admin_audit_logs').add({
      adminId: 'SYSTEM',
      eventType: 'course.buyout.request',
      target: { id: courseId, type: 'course' },
      details: `Demande de rachat : ${userData.fullName} propose "${courseData.title}" pour ${requestedPrice} XOF.`,
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("BUYOUT_REQUEST_ERROR:", error);
    return { success: false, error: error.message || "Une erreur est survenue lors de la demande." };
  }
}

/**
 * Approuver le rachat d'un cours (Action Admin).
 * Transfère la propriété à la plateforme.
 */
export async function approveCourseBuyoutAction({
  courseId,
  adminId,
}: {
  courseId: string;
  adminId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const courseRef = db.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();

    if (!courseDoc.exists) return { success: false, error: 'Cours introuvable.' };
    const data = courseDoc.data();
    
    const originalInstructorId = data?.instructorId;

    // Mise à jour de la propriété
    await courseRef.update({
      buyoutStatus: 'approved',
      isPlatformOwned: true,
      originalInstructorId: originalInstructorId,
      instructorId: 'NDARA_OFFICIAL', // Identifiant de la plateforme
      status: 'Published',
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Enregistrer le gain dans les retraits du formateur (simulation de paiement)
    await db.collection('payouts').add({
        instructorId: originalInstructorId,
        amount: data?.buyoutPrice || 0,
        status: 'valide',
        method: 'Vente Directe Plateau',
        date: FieldValue.serverTimestamp()
    });

    await db.collection('admin_audit_logs').add({
      adminId,
      eventType: 'course.buyout.approve',
      target: { id: courseId, type: 'course' },
      details: `Rachat du cours "${data?.title}" approuvé par l'admin ${adminId}. Propriété transférée.`,
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Sanctionner un formateur pour violation des règles de rachat (Plagiat/Republication).
 */
export async function sanctionInstructorForBuyoutViolation({
    userId,
    adminId,
    reason
}: {
    userId: string;
    adminId: string;
    reason: string;
}) {
    try {
        const db = getAdminDb();
        const userRef = db.collection('users').doc(userId);
        
        await userRef.update({
            'buyoutSanctions.isSanctioned': true,
            'buyoutSanctions.reason': reason,
            'buyoutSanctions.date': FieldValue.serverTimestamp(),
            status: 'suspended' // Bannissement immédiat pour fraude intellectuelle
        });

        await db.collection('security_logs').add({
            eventType: 'user_suspended',
            userId: adminId,
            targetId: userId,
            details: `Bannissement pour violation des règles de cession : ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function submitCourseForReviewAction({
  courseId,
  instructorId,
}: {
  courseId: string;
  instructorId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const courseRef = db.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();

    if (!courseDoc.exists) return { success: false, error: 'Cours introuvable.' };
    if (courseDoc.data()?.instructorId !== instructorId) {
      return { success: false, error: 'Vous n\'êtes pas autorisé à modifier ce cours.' };
    }

    await courseRef.update({
      status: 'Pending Review',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error submitting course for review:', error);
    return { success: false, error: error.message || 'Erreur serveur.' };
  }
}

export async function updateCourseStatusByAdmin({
  courseId,
  status,
  adminId,
}: {
  courseId: string;
  status: Course['status'];
  adminId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const courseRef = db.collection('courses').doc(courseId);
    
    const batch = db.batch();
    batch.update(courseRef, { status });

    batch.set(db.collection('admin_audit_logs').doc(), {
      adminId,
      eventType: 'course.moderation',
      target: { id: courseId, type: 'course' },
      details: `Le statut du cours a été changé à '${status}' par l'admin.`,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error('Error updating course status by admin:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteCourseByAdmin({
  courseId,
  adminId,
}: {
  courseId: string;
  adminId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const courseRef = db.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();
    if (!courseDoc.exists) {
      return { success: false, error: 'Cours introuvable.' };
    }
    const courseTitle = courseDoc.data()?.title || 'Titre inconnu';

    const batch = db.batch();
    batch.delete(courseRef);

    const auditLogRef = db.collection('admin_audit_logs').doc();
    batch.set(auditLogRef, {
      adminId,
      eventType: 'course.delete',
      target: { id: courseId, type: 'course' },
      details: `Le cours "${courseTitle}" a été supprimé par l'administrateur.`,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting course:', error);
    return { success: false, error: 'Une erreur est survenue lors de la suppression.' };
  }
}
