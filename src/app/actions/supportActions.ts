
'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

interface RefundAndRevokeParams {
  userId: string;
  courseId: string;
  ticketId: string;
}

export async function refundAndRevokeAccess(params: RefundAndRevokeParams): Promise<{ success: boolean; error?: string }> {
    const { userId, courseId, ticketId } = params;
    const batch = adminDb.batch();

    try {
        // 1. Mark the payment as refunded
        const paymentQuery = adminDb.collection('payments')
            .where('userId', '==', userId)
            .where('courseId', '==', courseId)
            .limit(1);
            
        const paymentSnapshot = await paymentQuery.get();
        if (!paymentSnapshot.empty) {
            const paymentRef = paymentSnapshot.docs[0].ref;
            batch.update(paymentRef, { 
                status: 'Refunded',
                refundedAt: Timestamp.now(),
                refundTicketId: ticketId,
            });
        }

        // 2. Delete the enrollment record
        const enrollmentId = `${userId}_${courseId}`;
        const enrollmentRef = adminDb.collection('enrollments').doc(enrollmentId);
        batch.delete(enrollmentRef);
        
        // 3. Close the support ticket
        const ticketRef = adminDb.collection('support_tickets').doc(ticketId);
        batch.update(ticketRef, { 
            status: 'fermé', 
            updatedAt: Timestamp.now(),
            resolution: 'Remboursé et accès révoqué'
        });

        // 4. Add a final message to the ticket
        const messageRef = ticketRef.collection('messages').doc();
        batch.set(messageRef, {
            senderId: 'SYSTEM',
            text: `Action système : Le remboursement a été traité et l'accès de l'étudiant au cours a été révoqué. Ce ticket est maintenant fermé.`,
            createdAt: Timestamp.now(),
        });
        
        await batch.commit();
        
        return { success: true };

    } catch (error: any) {
        console.error("Error in refundAndRevokeAccess:", error);
        return { success: false, error: "Une erreur est survenue lors du processus de remboursement." };
    }
}
