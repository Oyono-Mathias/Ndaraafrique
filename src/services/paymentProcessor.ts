'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendUserNotification } from '@/actions/notificationActions';
import type { NdaraPaymentDetails, Course, Settings, NdaraUser } from '@/lib/types';

/**
 * @fileOverview Ndara Payment Processor (Le Cerveau Financier V4).
 * ✅ SÉCURITÉ : Nettoyage récursif des 'undefined' pour Firestore.
 */

/**
 * Nettoie un objet de ses propriétés 'undefined' pour éviter les crashs Firestore.
 * Utile car le SDK Admin ne supporte pas toujours ignoreUndefinedProperties nativement.
 */
function sanitize(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  // Ne pas toucher aux types spéciaux de Firestore/Firebase
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
  // 🛡️ NETTOYAGE IMMÉDIAT
  const cleanDetails = sanitize(details);
  const { transactionId, gatewayTransactionId, provider, amount, currency, metadata } = cleanDetails;
  
  console.log(`[PaymentProcessor] Traitement de ${transactionId} pour l'utilisateur ${metadata?.userId}`);

  // Validation des champs critiques
  if (!metadata?.userId) {
      console.error("[PaymentProcessor] Erreur: userId manquant dans les métadonnées", metadata);
      throw new Error("USER_ID_MANQUANT");
  }

  const db = getAdminDb();

  try {
    // 1. Vérification Anti-Doublon (Idempotence)
    const paymentDocRef = db.collection('payments').doc(String(transactionId));
    const existingPayment = await paymentDocRef.get();
    
    if (existingPayment.exists && existingPayment.data()?.status === 'completed') {
      console.log(`✅ Transaction ${transactionId} déjà traitée.`);
      return { success: true };
    }

    const isTopup = metadata.type === 'wallet_topup' || metadata.courseId === 'WALLET_TOPUP';

    // 2. Récupération des données nécessaires
    const promises: any[] = [
      db.collection('settings').doc('global').get(),
      db.collection('users').doc(metadata.userId).get()
    ];

    if (!isTopup && metadata.courseId) {
        promises.push(db.collection('courses').doc(metadata.courseId).get());
    }

    const [settingsDoc, userDoc, courseDoc] = await Promise.all(promises);

    if (!userDoc.exists) {
        throw new Error("UTILISATEUR_INTROUVABLE");
    }

    const settings = (settingsDoc.exists ? settingsDoc.data() : {}) as Settings;
    const userData = userDoc.data() as NdaraUser;
    const batch = db.batch();

    // 3. Préparation du reçu de paiement
    const paymentData: any = {
      id: String(transactionId),
      gatewayTransactionId: String(gatewayTransactionId || transactionId),
      userId: metadata.userId,
      amount: Number(amount),
      currency: currency || 'XAF',
      provider: provider || 'mesomb',
      date: FieldValue.serverTimestamp(),
      status: 'completed',
      metadata: sanitize({
          ...metadata,
          processedAt: new Date().toISOString()
      })
    };

    // --- LOGIQUE WALLET (RECHARGE) ---
    if (isTopup) {
        paymentData.courseTitle = "Recharge Wallet Ndara";
        const userRef = db.collection('users').doc(metadata.userId);
        batch.update(userRef, { 
            balance: FieldValue.increment(Number(amount)),
            lastTopupDate: FieldValue.serverTimestamp()
        });
    } 
    // --- LOGIQUE ACHAT DE COURS ---
    else {
        if (!courseDoc || !courseDoc.exists) throw new Error("COURS_INTROUVABLE");
        const courseData = courseDoc.data() as Course;

        const instructorSharePercent = settings.commercial?.instructorShare || 80;
        const affiliateSharePercent = settings.commercial?.affiliatePercentage || 10;
        
        const effectiveAffiliateId = metadata.affiliateId || userData.referredBy;
        const hasAffiliate = !!effectiveAffiliateId && effectiveAffiliateId !== metadata.userId;

        const affiliateCommission = hasAffiliate ? (amount * affiliateSharePercent) / 100 : 0;
        const instructorRevenue = (amount * instructorSharePercent) / 100;
        const platformFee = amount - instructorRevenue - affiliateCommission;

        paymentData.courseId = metadata.courseId;
        paymentData.courseTitle = courseData.title;
        paymentData.instructorId = courseData.instructorId;
        
        // Inscription de l'étudiant
        const enrollmentId = `${metadata.userId}_${metadata.courseId}`;
        const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
        batch.set(enrollmentRef, {
          id: enrollmentId,
          studentId: metadata.userId,
          courseId: metadata.courseId,
          instructorId: courseData.instructorId,
          status: 'active', 
          progress: 0,
          enrollmentDate: FieldValue.serverTimestamp(),
          priceAtEnrollment: amount,
          transactionId
        }, { merge: true });

        // Crédit de l'instructeur
        const sellerId = courseData.ownerId || courseData.instructorId;
        if (sellerId && sellerId !== 'NDARA_OFFICIAL') {
            const sellerRef = db.collection('users').doc(sellerId);
            batch.update(sellerRef, {
                balance: FieldValue.increment(instructorRevenue)
            });
        }
    }

    // 4. Validation finale du batch
    batch.set(paymentDocRef, sanitize(paymentData));
    await batch.commit();

    // 5. Notification
    try {
        const displayCurrency = currency || 'FCFA';
        await sendUserNotification(metadata.userId, {
          text: isTopup 
            ? `Votre compte a été crédité de ${amount.toLocaleString()} ${displayCurrency}.`
            : `Félicitations ! Votre formation "${paymentData.courseTitle}" est disponible.`,
          link: isTopup ? `/student/wallet` : `/student/courses/${metadata.courseId}`,
          type: 'success'
        });
    } catch (e) {
        console.warn("Notification non envoyée, mais paiement validé.");
    }

    return { success: true };

  } catch (error: any) {
    console.error("❌ ERREUR CRITIQUE PAYEMENT:", error.message);
    throw error;
  }
}