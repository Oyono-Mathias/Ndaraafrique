'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { NdaraPaymentDetails, Course, Settings } from '@/lib/types';

/**
 * @fileOverview Processeur financier centralisé et idempotent.
 * ✅ GESTION DES GELS : Utilise settings.finance.withdrawalDelayDays.
 * ✅ COMMISSIONS : Utilise settings.finance.platformRevenuePercent.
 */

export async function processNdaraPayment(details: NdaraPaymentDetails) {
  const { transactionId, gatewayTransactionId, provider, amount, currency, metadata } = details;
  
  if (!metadata?.userId) throw new Error("USER_ID_REQUIRED");

  const db = getAdminDb();

  try {
    return await db.runTransaction(async (transaction) => {
        const paymentDocRef = db.collection('payments').doc(String(transactionId));
        const paymentSnap = await transaction.get(paymentDocRef);
        
        // 🛡️ IDEMPOTENCE : Stop si déjà complété
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

        // 1. Mise à jour du statut paiement
        transaction.update(paymentDocRef, {
            status: 'completed',
            gatewayTransactionId: gatewayTransactionId || transactionId,
            verifiedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            amount: Number(amount),
            fraudScore: metadata.fraudScore || 0
        });

        if (isTopup) {
            // 2a. RECHARGEMENT WALLET
            transaction.update(userRef, { 
                balance: FieldValue.increment(Number(amount)),
                lastWalletUpdate: FieldValue.serverTimestamp()
            });
        } else {
            // 2b. INSCRIPTION COURS
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

                // --- PARTAGE DE REVENUS FORMATEUR ---
                // 🛡️ Utilise settings.finance.platformRevenuePercent
                const platformFeeRate = settings.finance?.platformRevenuePercent || 20;
                const instructorShareRate = 100 - platformFeeRate;
                const instructorRevenue = (amount * instructorShareRate) / 100;
                
                const finalInstructorId = courseData.ownerId || courseData.instructorId;

                if (finalInstructorId && finalInstructorId !== 'NDARA_OFFICIAL') {
                    transaction.update(db.collection('users').doc(finalInstructorId), {
                        balance: FieldValue.increment(instructorRevenue)
                    });
                }

                // --- GESTION AFFILIATION (AMBASSADEUR) ---
                if (metadata.affiliateId && metadata.affiliateId !== metadata.userId) {
                    const affiliateRef = db.collection('users').doc(metadata.affiliateId);
                    const affSnap = await transaction.get(affiliateRef);

                    if (affSnap.exists) {
                        // Utilise settings.finance.platformRevenuePercent comme base pour l'affilié ? 
                        // Non, utilisons un taux par défaut de 10% ou rajoutons-le au schéma
                        const affCommission = (amount * 10) / 100;
                        const delayDays = settings.finance?.withdrawalDelayDays || 14;
                        
                        const unlockDate = new Date();
                        unlockDate.setDate(unlockDate.getDate() + delayDays);

                        const affTransRef = db.collection('affiliate_transactions').doc();
                        transaction.set(affTransRef, {
                            id: affTransRef.id,
                            affiliateId: metadata.affiliateId,
                            buyerId: metadata.userId,
                            buyerName: userSnap.data()?.fullName || 'Étudiant Ndara',
                            courseId: metadata.courseId,
                            courseTitle: courseData.title,
                            amount: Number(amount),
                            commissionAmount: affCommission,
                            status: 'pending',
                            createdAt: FieldValue.serverTimestamp(),
                            unlockDate: Timestamp.fromDate(unlockDate)
                        });

                        transaction.update(affiliateRef, {
                            pendingAffiliateBalance: FieldValue.increment(affCommission),
                            'affiliateStats.sales': FieldValue.increment(1),
                            'affiliateStats.earnings': FieldValue.increment(affCommission)
                        });
                    }
                }
            }
        }

        // 3. LOG D'AUDIT
        transaction.set(db.collection('admin_audit_logs').doc(), {
            eventType: 'payment_verified',
            adminId: 'SYSTEM_BOT',
            target: { id: metadata.userId, type: 'user' },
            details: `Paiement ${provider} validé. ID: ${transactionId}`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    });

  } catch (error: any) {
    console.error("❌ [Processor] ÉCHEC CRITIQUE:", error.message);
    throw error;
  }
}
