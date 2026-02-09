'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Course } from '@/lib/types';

/**
 * Action pour soumettre un cours à la modération.
 * Utilisée par les formateurs.
 */
export async function submitCourseForReviewAction({
  courseId,
  instructorId,
}: {
  courseId: string;
  instructorId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) return { success: false, error: 'Service indisponible' };
  try {
    const courseRef = adminDb.collection('courses').doc(courseId);
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
    return { success: false, error: error.message };
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
  if (!adminDb) return { success: false, error: 'Service indisponible' };
  try {
    const courseRef = adminDb.collection('courses').doc(courseId);
    
    const batch = adminDb.batch();
    batch.update(courseRef, { status });

    // Add to admin audit log
    batch.set(adminDb.collection('admin_audit_logs').doc(), {
      adminId,
      eventType: 'course.moderation',
      target: { id: courseId, type: 'course' },
      details: `Le statut du cours a été changé à '${status}' par l'admin ${adminId}.`,
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
  if (!adminDb) return { success: false, error: 'Service indisponible' };
  try {
    const courseRef = adminDb.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();
    if (!courseDoc.exists) {
      return { success: false, error: 'Cours introuvable.' };
    }
    const courseTitle = courseDoc.data()?.title || 'Titre inconnu';

    const batch = adminDb.batch();

    // 1. Delete the course document
    batch.delete(courseRef);

    // 2. Log the action to the audit log
    const auditLogRef = adminDb.collection('admin_audit_logs').doc();
    batch.set(auditLogRef, {
      adminId,
      eventType: 'course.delete',
      target: { id: courseId, type: 'course' },
      details: `Le cours "${courseTitle}" (ID: ${courseId}) a été supprimé par l'administrateur ${adminId}.`,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting course:', error);
    return { success: false, error: 'Une erreur est survenue lors de la suppression du cours.' };
  }
}
