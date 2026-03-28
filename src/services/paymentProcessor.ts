
'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendUserNotification } from '@/actions/notificationActions';
import type { NdaraPaymentDetails, Course, Settings, NdaraUser } from '@/lib/types';

/**
 * @fileOverview Ndara Payment Processor (Cerveau Financier v4.5).
 * ✅ ATOMICITÉ : Utilisation de transactions pour garantir l'intégrité.
 * ✅ IDEMPOTENCE : Empêche strictement le double traitement.
 */

function sanitize(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date || obj instanceof Timestamp || (obj.constructor && obj.constructor.name === 'FieldValue')) {
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(sanitize);
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, sanitize(v)])
  );
}

export async function processNdaraPayment(details: NdaraPaymentDetails) {
  const cleanDetails = sanitize(details);
  const { transactionId, gatewayTransactionId, provider, amount, currency, metadata } = cleanDetails;
  
  if (!metadata?.userId) throw new Error("USER_ID_MANQUANT");

  const db = getAdminDb();

  try {
    // 🛡️ TRANSACTION ATOMIQUE : Tout passe ou rien ne passe
    return await db.runTransaction(async (transaction) => {
        const paymentDocRef = db.collection('payments').doc(String(transactionId));
        const paymentSnap = await transaction.get(paymentDocRef);
        
        // Si le paiement est déjà complété, on ne fait rien
        if (paymentSnap.exists && paymentSnap.data()?.status === 'completed') {
            return { success: true, alreadyProcessed: true };
        }

        const isTopup = metadata.type === 'wallet_topup' || metadata.courseId === 'WALLET_TOPUP';
        const userRef = db.collection('users').doc(metadata.userId);
        const settingsRef = db.collection('settings').doc('global');
        
        const [userSnap, settingsSnap] = await Promise.all([
            transaction.get(userRef),
            transaction.get(settingsRef)
        ]);

        if (!userSnap.exists) throw new Error("USER_NOT_FOUND");
        const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as Settings;

        const paymentData: any = {
            status: 'completed',
            gatewayTransactionId: String(gatewayTransactionId || transactionId),
            updatedAt: FieldValue.serverTimestamp(),
            amount: Number(amount),
            provider: provider || 'mesomb'
        };

        if (isTopup) {
            transaction.update(userRef, { 
                balance: FieldValue.increment(Number(amount)),
                lastTopupDate: FieldValue.serverTimestamp()
            });
        } else {
            const courseRef = db.collection('courses').doc(metadata.courseId);
            const courseSnap = await transaction.get(courseRef);
            if (!courseSnap.exists) throw new Error("COURSE_NOT_FOUND");
            
            const courseData = courseSnap.data() as Course;
            const instructorShare = settings.commercial?.instructorShare || 80;
            const revenue = (amount * instructorShare) / 100;

            // Inscription
            const enrollmentId = `${metadata.userId}_${metadata.courseId}`;
            transaction.set(db.collection('enrollments').doc(enrollmentId), {
                id: enrollmentId,
                studentId: metadata.userId,
                courseId: metadata.courseId,
                instructorId: courseData.instructorId,
                status: 'active',
                progress: 0,
                enrollmentDate: FieldValue.serverTimestamp(),
                priceAtEnrollment: amount
            }, { merge: true });

            // Crédit Expert
            const sellerId = courseData.ownerId || courseData.instructorId;
            if (sellerId && sellerId !== 'NDARA_OFFICIAL') {
                transaction.update(db.collection('users').doc(sellerId), {
                    balance: FieldValue.increment(revenue)
                });
            }
        }

        transaction.update(paymentDocRef, paymentData);
        
        // Notifications (Hors transaction car non critique)
        setTimeout(() => {
            sendUserNotification(metadata.userId, {
                text: isTopup ? `Dépôt de ${amount} ${currency} validé.` : `Accès débloqué pour ${metadata.courseId}`,
                type: 'success',
                link: isTopup ? '/student/wallet' : `/student/courses/${metadata.courseId}`
            }).catch(() => {});
        }, 100);

        return { success: true };
    });

  } catch (error: any) {
    console.error("❌ ERREUR FINANCIÈRE:", error.message);
    throw error;
  }
}
