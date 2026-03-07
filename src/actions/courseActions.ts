'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Course } from '@/lib/types';

/**
 * Soumettre une demande de rachat de cours par la plateforme.
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
    const courseRef = db.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();

    if (!courseDoc.exists) return { success: false, error: 'Cours introuvable.' };
    const data = courseDoc.data();
    if (data?.instructorId !== instructorId) return { success: false, error: 'Permission refusée.' };

    await courseRef.update({
      buyoutStatus: 'requested',
      buyoutPrice: requestedPrice,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Logger la demande
    await db.collection('admin_audit_logs').add({
      adminId: 'SYSTEM',
      eventType: 'course.buyout.request',
      target: { id: courseId, type: 'course' },
      details: `L'instructeur ${instructorId} demande un rachat de "${data?.title}" pour ${requestedPrice} XOF.`,
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
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
