'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendAdminNotification, sendUserNotification } from './notificationActions';

interface RefundAndRevokeAccessParams {
  userId: string;
  courseId: string;
  ticketId: string;
}

export async function createSupportTicket({ 
    userId, 
    subject, 
    message, 
    category, 
    courseId, 
    instructorId 
}: { 
    userId: string; 
    subject: string; 
    message: string; 
    category: 'Paiement' | 'Technique' | 'Pédagogique'; 
    courseId?: string; 
    instructorId?: string; 
}) {
  try {
    const db = getAdminDb();
    const ticketRef = db.collection('support_tickets').doc();
    const ticketData = {
      userId,
      subject,
      category,
      courseId: courseId || 'none',
      instructorId: instructorId || 'none',
      status: 'ouvert',
      lastMessage: message,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    const batch = db.batch();
    batch.set(ticketRef, ticketData);
    
    const messageRef = ticketRef.collection('messages').doc();
    batch.set(messageRef, {
      senderId: userId,
      text: message,
      createdAt: FieldValue.serverTimestamp()
    });

    await batch.commit();

    try {
        await sendAdminNotification({
            title: 'Nouveau ticket de support',
            body: `Sujet : ${subject} (${category})`,
            link: `/admin/support/${ticketRef.id}`,
            type: 'newSupportTickets'
        });
    } catch (notifyError) {
        console.warn("Ticket créé mais échec de la notification admin :", notifyError);
    }

    return { success: true, ticketId: ticketRef.id };
  } catch (error: any) {
    console.error("Error creating support ticket:", error);
    return { success: false, error: "Une erreur est survenue lors de la création du ticket." };
  }
}

export async function refundAndRevokeAccess(params: RefundAndRevokeAccessParams): Promise<{ success: boolean; error?: string }> {
    const { userId, courseId, ticketId } = params;
    
    try {
        const db = getAdminDb();
        const batch = db.batch();
        const paymentQuery = db.collection('payments')
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

        const enrollmentId = `${userId}_${courseId}`;
        const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
        batch.delete(enrollmentRef);
        
        const ticketRef = db.collection('support_tickets').doc(ticketId);
        batch.update(ticketRef, { 
            status: 'fermé', 
            updatedAt: Timestamp.now(),
            resolution: 'Remboursé et accès révoqué'
        });

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
        const db = getAdminDb();
        const courseRef = db.collection('courses').doc(courseId);
        const courseDoc = await courseRef.get();
        if (!courseDoc.exists) return { success: false, error: "Cours introuvable." };
        
        const newStatus = decision === 'approve' ? 'Published' : 'Draft';
        await courseRef.update({
            status: newStatus,
            moderationFeedback: feedback || FieldValue.delete(),
            publishedAt: decision === 'approve' ? FieldValue.serverTimestamp() : null
        });

        await db.collection('security_logs').add({
            eventType: decision === 'approve' ? 'course_approved' : 'course_rejected',
            userId: adminId,
            targetId: courseId,
            details: `Course "${courseDoc.data()?.title}" ${decision} by admin ${adminId}. Feedback: ${feedback || 'N/A'}`,
            timestamp: FieldValue.serverTimestamp(),
        });

        await db.collection('admin_audit_logs').add({
            adminId: adminId,
            eventType: 'course.moderation',
            target: { id: courseId, type: 'course' },
            details: `Course "${courseDoc.data()?.title}" was ${decision}ed by admin ${adminId}.`,
            timestamp: FieldValue.serverTimestamp(),
        });

        const instructorId = courseDoc.data()?.instructorId;
        if (instructorId) {
            await sendUserNotification(instructorId, {
                text: `Votre cours "${courseDoc.data()?.title}" a été ${decision === 'approve' ? 'approuvé et publié' : 'rejeté. Des modifications sont nécessaires.'}.`,
                link: `/instructor/courses/edit/${courseId}`
            });
        }
        
        return { success: true };
    } catch (error: any) {
        console.error("Error moderating course:", error);
        return { success: false, error: error.message };
    }
}

export async function processPayout(
    payoutId: string,
    decision: 'valide' | 'rejete',
    adminId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminDb();
        const payoutRef = db.collection('payouts').doc(payoutId);
        await payoutRef.update({ status: decision });

        await db.collection('admin_audit_logs').add({
            adminId: adminId,
            eventType: 'payout.process',
            target: { id: payoutId, type: 'payout' },
            details: `Payout ${payoutId} processed with decision '${decision}' by admin ${adminId}.`,
            timestamp: FieldValue.serverTimestamp(),
        });
        
        return { success: true };
    } catch (error: any) {
        console.error("Error processing payout:", error);
        return { success: false, error: error.message };
    }
}

export async function addAdminReplyToTicket({ ticketId, adminId, text }: { ticketId: string, adminId: string, text: string }) {
    try {
        const db = getAdminDb();
        const ticketRef = db.collection('support_tickets').doc(ticketId);
        const ticketDoc = await ticketRef.get();
        if (!ticketDoc.exists) throw new Error("Ticket introuvable.");

        const batch = db.batch();
        const messagePayload = {
            senderId: adminId,
            text: `[Support Ndara Afrique] : ${text}`,
            createdAt: FieldValue.serverTimestamp()
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
        if (studentId) {
            await sendUserNotification(studentId, {
                text: `Vous avez reçu une nouvelle réponse pour votre ticket: "${ticketDoc.data()?.subject}"`,
                link: `/student/support`
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error adding admin reply:", error);
        return { success: false, error: error.message };
    }
}

export async function closeTicket({ ticketId, adminId, resolution }: { ticketId: string, adminId: string, resolution: string }): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminDb();
        const ticketRef = db.collection('support_tickets').doc(ticketId);
        const batch = db.batch();

        batch.update(ticketRef, {
            status: 'fermé',
            updatedAt: FieldValue.serverTimestamp(),
            resolution: resolution || 'Résolu par l\'administrateur.'
        });

        const messageRef = ticketRef.collection('messages').doc();
        batch.set(messageRef, {
            senderId: 'SYSTEM',
            text: `Ticket fermé par l'administrateur. Résolution : ${resolution}`,
            createdAt: FieldValue.serverTimestamp(),
        });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error closing ticket:", error);
        return { success: false, error: "Une erreur est survenue lors de la fermeture du ticket." };
    }
}
