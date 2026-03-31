'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendUserNotification } from '@/actions/notificationActions';
import type { NdaraPaymentDetails, Course, Settings } from '@/lib/types';

/**
 * @fileOverview Cerveau Financier Ndara (V5.0).
 * ✅ ATOMICITÉ : Transactions Firestore pour garantir zéro perte de données.
 * ✅ IDEMPOTENCE : Protection stricte contre le double-crédit.
 */

export async function processNdaraPayment(details: NdaraPaymentDetails) {
  const { transactionId, gatewayTransactionId, provider, amount, currency, metadata } = details;
  
  if (!metadata?.userId) throw new Error("IDENTIFIANT_UTILISATEUR_MANQUANT");

  const db = getAdminDb();

  try {
    return await db.runTransaction(async (transaction) => {
        const paymentDocRef = db.collection('payments').doc(String(transactionId));
        const paymentSnap = await transaction.get(paymentDocRef);
        
        // 🛡️ IDEMPOTENCE : Si déjà traité, on sort proprement
        if (paymentSnap.exists && paymentSnap.data()?.status === 'completed') {
            console.log(`[Processor] Transaction ${transactionId} déjà traitée. Skip.`);
            return { success: true, alreadyProcessed: true };
        }

        const userRef = db.collection('users').doc(metadata.userId);
        const settingsRef = db.collection('settings').doc('global');
        
        const [userSnap, settingsSnap] = await Promise.all([
            transaction.get(userRef),
            transaction.get(settingsRef)
        ]);

        if (!userSnap.exists) throw new Error("UTILISATEUR_INTROUVABLE");
        const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as Settings;

        const isTopup = metadata.type === 'wallet_topup' || metadata.courseId === 'WALLET_TOPUP';

        // 1. Mise à jour de la transaction
        transaction.update(paymentDocRef, {
            status: 'completed',
            gatewayTransactionId: String(gatewayTransactionId || transactionId),
            verifiedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            amount: Number(amount),
            provider: provider || 'mesomb'
        });

        if (isTopup) {
            // 2a. Cas Recharge Wallet
            transaction.update(userRef, { 
                balance: FieldValue.increment(Number(amount)),
                lastWalletUpdate: FieldValue.serverTimestamp()
            });
        } else {
            // 2b. Cas Achat de cours
            const courseRef = db.collection('courses').doc(metadata.courseId);
            const courseSnap = await transaction.get(courseRef);
            
            if (courseSnap.exists) {
                const courseData = courseSnap.data() as Course;
                const enrollmentId = `${metadata.userId}_${metadata.courseId}`;
                
                // Inscription immédiate
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

                // Crédit de l'instructeur (Partage de revenus)
                const instructorShare = settings.commercial?.instructorShare || 80;
                const instructorRevenue = (amount * instructorShare) / 100;
                const instructorId = courseData.ownerId || courseData.instructorId;

                if (instructorId && instructorId !== 'NDARA_OFFICIAL') {
                    transaction.update(db.collection('users').doc(instructorId), {
                        balance: FieldValue.increment(instructorRevenue)
                    });
                }
            }
        }

        // 3. Journalisation de sécurité
        const auditRef = db.collection('admin_audit_logs').doc();
        transaction.set(auditRef, {
            eventType: 'payment_processed',
            adminId: 'SYSTEM_PAYMENT',
            target: { id: metadata.userId, type: 'user' },
            details: `Paiement ${provider} de ${amount} ${currency} validé pour ${isTopup ? 'Recharge' : 'Cours ' + metadata.courseId}`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    });

  } catch (error: any) {
    console.error("❌ ÉCHEC CRITIQUE DU PROCESSEUR FINANCIER:", error.message);
    throw error;
  }
}
