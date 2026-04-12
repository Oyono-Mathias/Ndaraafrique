'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { NdaraPaymentDetails, Course, Settings } from '@/lib/types';

/**
 * @fileOverview Processeur financier centralisé et idempotent.
 * ✅ SÉCURITÉ : Gère les crédits (topup) et débits (purchase).
 * ✅ ANTI-FRAUDE : Idempotence stricte basée sur l'ID de transaction.
 */

export async function processNdaraPayment(details: NdaraPaymentDetails) {
  const { transactionId, gatewayTransactionId, provider, amount, currency, metadata } = details;
  
  if (!metadata?.userId) throw new Error("USER_ID_REQUIRED");

  const db = getAdminDb();

  try {
    return await db.runTransaction(async (transaction) => {
        const paymentDocRef = db.collection('payments').doc(String(transactionId));
        const paymentSnap = await transaction.get(paymentDocRef);
        
        // 🛡️ IDEMPOTENCE : Si déjà marqué "completed", on ne fait rien
        if (paymentSnap.exists && paymentSnap.data()?.status === 'completed') {
            return { success: true, alreadyProcessed: true };
        }

        const userRef = db.collection('users').doc(metadata.userId);
        const [userSnap] = await Promise.all([
            transaction.get(userRef)
        ]);

        if (!userSnap.exists) throw new Error("USER_NOT_FOUND");

        const isTopup = metadata.type === 'wallet_topup' || metadata.courseId === 'WALLET_TOPUP';

        // 1. Enregistrement / Mise à jour du reçu de paiement
        const paymentData = {
            id: String(transactionId),
            userId: metadata.userId,
            amount: Number(amount),
            currency: currency || 'XOF',
            provider: provider,
            status: 'completed',
            date: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            gatewayTransactionId: gatewayTransactionId || transactionId,
            metadata: { ...metadata }
        };

        transaction.set(paymentDocRef, paymentData, { merge: true });

        if (isTopup) {
            // 2a. RECHARGEMENT DU WALLET
            transaction.update(userRef, { 
                balance: FieldValue.increment(Number(amount)),
                updatedAt: FieldValue.serverTimestamp()
            });
        } else if (metadata.courseId) {
            // 2b. ACHAT DE COURS
            const courseRef = db.collection('courses').doc(metadata.courseId);
            const courseSnap = await transaction.get(courseRef);
            
            if (courseSnap.exists) {
                const courseData = courseSnap.data() as Course;
                const enrollmentId = `${metadata.userId}_${metadata.courseId}`;
                
                // Créer l'inscription
                transaction.set(db.collection('enrollments').doc(enrollmentId), {
                    id: enrollmentId,
                    studentId: metadata.userId,
                    courseId: metadata.courseId,
                    instructorId: courseData.instructorId,
                    status: 'active',
                    progress: 0,
                    enrollmentDate: FieldValue.serverTimestamp(),
                    lastAccessedAt: FieldValue.serverTimestamp(),
                    priceAtEnrollment: Number(amount)
                });

                // Incrémenter le compteur du cours
                transaction.update(courseRef, {
                    participantsCount: FieldValue.increment(1)
                });

                // Distribuer la part instructeur (si applicable)
                if (courseData.instructorId && courseData.instructorId !== 'NDARA_OFFICIAL') {
                    const instructorRef = db.collection('users').doc(courseData.instructorId);
                    // On applique une commission standard de 70% (à dynamiser plus tard via settings)
                    const instructorShare = (Number(amount) * 70) / 100;
                    transaction.update(instructorRef, {
                        balance: FieldValue.increment(instructorShare)
                    });
                }
            }
        }

        // 3. LOG D'AUDIT
        const auditRef = db.collection('admin_audit_logs').doc();
        transaction.set(auditRef, {
            eventType: isTopup ? 'wallet.recharge' : 'course.purchase',
            adminId: provider === 'admin_recharge' ? metadata.adminId : 'SYSTEM',
            target: { id: metadata.userId, type: 'user' },
            details: `${isTopup ? 'Crédit' : 'Achat'} de ${amount} ${currency} via ${provider}`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    });

  } catch (error: any) {
    console.error("❌ [Processor] Critical Failure:", error.message);
    throw error;
  }
}
