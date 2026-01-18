
'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendAdminNotification, sendUserNotification } from './notificationActions';

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


export async function moderateCourse(
    courseId: string, 
    decision: 'approve' | 'reject', 
    adminId: string, 
    feedback?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const courseRef = adminDb.collection('courses').doc(courseId);
        const courseDoc = await courseRef.get();
        if (!courseDoc.exists) return { success: false, error: "Cours introuvable." };
        
        const newStatus = decision === 'approve' ? 'Published' : 'Draft';
        await courseRef.update({
            status: newStatus,
            moderationFeedback: feedback || FieldValue.delete(),
            publishedAt: decision === 'approve' ? FieldValue.serverTimestamp() : null
        });

        // Log to security log
        await adminDb.collection('security_logs').add({
            eventType: decision === 'approve' ? 'course_approved' : 'course_rejected',
            userId: adminId,
            targetId: courseId,
            details: `Course "${courseDoc.data()?.title}" ${decision} by admin ${adminId}. Feedback: ${feedback || 'N/A'}`,
            timestamp: FieldValue.serverTimestamp(),
        });

        // Log to admin audit log
        await adminDb.collection('admin_audit_logs').add({
            adminId: adminId,
            eventType: 'course.moderation',
            target: { id: courseId, type: 'course' },
            details: `Course "${courseDoc.data()?.title}" was ${decision}ed by admin ${adminId}.`,
            timestamp: FieldValue.serverTimestamp(),
        });

        // Notify the instructor
        const instructorId = courseDoc.data()?.instructorId;
        if (instructorId) {
            await sendUserNotification(instructorId, {
                title: `Votre cours a été ${decision === 'approve' ? 'approuvé' : 'rejeté'}`,
                body: `Votre cours "${courseDoc.data()?.title}" vient d'être ${decision === 'approve' ? 'publié !' : 'examiné. Des modifications sont nécessaires.'}`,
                link: `/instructor/courses/edit/${courseId}`
            });
        }
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function processPayout(
    payoutId: string,
    decision: 'valide' | 'rejete',
    adminId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const payoutRef = adminDb.collection('payouts').doc(payoutId);
        await payoutRef.update({ status: decision });

        // Add to admin audit log
        await adminDb.collection('admin_audit_logs').add({
            adminId: adminId,
            eventType: 'payout.process',
            target: { id: payoutId, type: 'payout' },
            details: `Payout ${payoutId} processed with decision '${decision}' by admin ${adminId}.`,
            timestamp: FieldValue.serverTimestamp(),
        });
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function addAdminReplyToTicket({ ticketId, adminId, text }: { ticketId: string, adminId: string, text: string }) {
    try {
        const ticketRef = adminDb.collection('support_tickets').doc(ticketId);
        const ticketDoc = await ticketRef.get();
        if (!ticketDoc.exists) throw new Error("Ticket introuvable.");

        const batch = adminDb.batch();

        const messagePayload = {
            senderId: adminId,
            text: `[Support Ndara Afrique] : ${text}`,
            createdAt: FieldValue.serverTimestamp(),
        };
        const messageRef = ticketRef.collection('messages').doc();
        batch.set(messageRef, messagePayload);

        batch.update(ticketRef, {
            lastMessage: text,
            updatedAt: FieldValue.serverTimestamp(),
            status: 'ouvert'
        });

        await batch.commit();

        const studentId = ticketDoc.data()?.userId;
        const instructorId = ticketDoc.data()?.instructorId;
        if (studentId) {
            await sendUserNotification(studentId, {
                title: 'Nouvelle réponse du support',
                body: `Vous avez reçu une nouvelle réponse pour votre ticket: "${ticketDoc.data()?.subject}"`,
                link: `/questions-reponses/${ticketId}`
            });
        }
        if (instructorId) {
            await sendUserNotification(instructorId, {
                title: 'Nouvelle réponse du support concernant votre cours',
                body: `Une nouvelle réponse a été ajoutée au ticket: "${ticketDoc.data()?.subject}"`,
                link: `/questions-reponses`
            });
        }


        return { success: true };
    } catch (error: any) {
        console.error("Error adding admin reply:", error);
        return { success: false, error: error.message };
    }
}
