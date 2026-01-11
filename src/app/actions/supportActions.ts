
'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface RefundAndRevokeParams {
  userId: string;
  courseId: string;
  ticketId: string;
}

export async function refundAndRevokeAccess(params: RefundAndRevokeParams): Promise<{ success: boolean; error?: string }> {
  const { userId, courseId, ticketId } = params;

  if (!userId || !courseId || !ticketId) {
    return { success: false, error: 'Informations manquantes pour traiter la demande.' };
  }

  const enrollmentId = `${userId}_${courseId}`;
  const enrollmentRef = adminDb.collection('enrollments').doc(enrollmentId);
  const ticketRef = adminDb.collection('support_tickets').doc(ticketId);

  try {
    const enrollmentDoc = await enrollmentRef.get();
    if (!enrollmentDoc.exists) {
      // If enrollment doesn't exist, maybe it was already refunded. Close ticket and report success.
      await ticketRef.update({ status: 'fermé', updatedAt: FieldValue.serverTimestamp() });
      return { success: true };
    }
    
    // Find the related payment to mark as refunded.
    // This assumes there's one payment per enrollment, which might need adjustment based on real logic.
    const paymentsQuery = await adminDb.collection('payments')
      .where('userId', '==', userId)
      .where('courseId', '==', courseId)
      .limit(1)
      .get();
      
    const batch = adminDb.batch();

    if (!paymentsQuery.empty) {
      const paymentDoc = paymentsQuery.docs[0];
      batch.update(paymentDoc.ref, { status: 'Refunded' });
    }

    // Delete the enrollment document
    batch.delete(enrollmentRef);

    // Update the support ticket status
    batch.update(ticketRef, { status: 'fermé', updatedAt: FieldValue.serverTimestamp() });

    await batch.commit();

    return { success: true };

  } catch (error: any) {
    console.error("Error in refundAndRevokeAccess action:", error);
    return { success: false, error: error.message || 'Une erreur inconnue est survenue lors de la révocation.' };
  }
}

    
