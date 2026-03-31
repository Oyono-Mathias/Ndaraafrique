
'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { NdaraPaymentDetails, Course, Settings } from '@/lib/types';

/**
 * @fileOverview Processeur financier atomique et idempotent.
 * ✅ ATOMICITÉ : Transaction Firestore.
 * ✅ INTÉGRITÉ : Vérification de statut avant crédit.
 */

export async function processNdaraPayment(details: NdaraPaymentDetails) {
  const { transactionId, gatewayTransactionId, provider, amount, currency, metadata } = details;
  
  if (!metadata?.userId) throw new Error("USER_ID_REQUIRED");

  const db = getAdminDb();

  try {
    return await db.runTransaction(async (transaction) => {
        const paymentDocRef = db.collection('payments').doc(String(transactionId));
        const paymentSnap = await transaction.get(paymentDocRef);
        
        // 🛡️ IDEMPOTENCE : Stop si déjà traité
        if (paymentSnap.exists && paymentSnap.data()?.status === 'completed') {
            return { success: true, alreadyProcessed: true };
        }

        const userRef = db.collection('users').doc(metadata.userId);
        const settingsRef = db.collection('settings').doc('global');
        const [userSnap, settingsSnap] = await Promise.all([
            transaction.get(userRef),
            transaction.get(settingsRef)
        ]);

        if (!userSnap.exists) throw new Error("USER_NOT_FOUND");
        const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as Settings;

        const isTopup = metadata.type === 'wallet_topup' || metadata.courseId === 'WALLET_TOPUP';

        // 1. Mise à jour de la transaction (Statut final)
        transaction.update(paymentDocRef, {
            status: 'completed',
            gatewayTransactionId: gatewayTransactionId || transactionId,
            verifiedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            amount: Number(amount),
            fraudScore: metadata.fraudScore || 0
        });

        if (isTopup) {
            // 2a. Crédit Wallet
            transaction.update(userRef, { 
                balance: FieldValue.increment(Number(amount)),
                lastWalletUpdate: FieldValue.serverTimestamp()
            });
        } else {
            // 2b. Achat de cours + Inscription
            const courseRef = db.collection('courses').doc(metadata.courseId);
            const courseSnap = await transaction.get(courseRef);
            
            if (courseSnap.exists) {
                const courseData = courseSnap.data() as Course;
                const enrollmentId = `${metadata.userId}_${metadata.courseId}`;
                
                transaction.set(db.collection('enrollments').doc(enrollmentId), {
                    id: enrollmentId,
                    studentId: metadata.userId,
                    courseId: metadata.courseId,
                    instructorId: courseData.instructorId,
                    status: 'active',
                    progress: 0,
                    enrollmentDate: FieldValue.serverTimestamp(),
                    pricePaid: amount
                });

                // Partage de revenus Instructeur
                const instructorShare = settings.commercial?.instructorShare || 80;
                const instructorRevenue = (amount * instructorShare) / 100;
                const finalInstructorId = courseData.ownerId || courseData.instructorId;

                if (finalInstructorId && finalInstructorId !== 'NDARA_OFFICIAL') {
                    transaction.update(db.collection('users').doc(finalInstructorId), {
                        balance: FieldValue.increment(instructorRevenue)
                    });
                }
            }
        }

        // 3. Audit Log de succès
        const auditRef = db.collection('admin_audit_logs').doc();
        transaction.set(auditRef, {
            eventType: 'payment_verified',
            adminId: 'SYSTEM_BOT',
            target: { id: metadata.userId, type: 'user' },
            details: `Paiement ${provider} validé (${amount} ${currency}). Risk Score: ${metadata.fraudScore || 0}`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    });

  } catch (error: any) {
    console.error("❌ CRITICAL PROCESSOR FAILURE:", error.message);
    throw error;
  }
}
