'use server';

/**
 * @fileOverview Initiation sécurisée des paiements MeSomb.
 * ✅ PRODUCTION : Utilisation impérative des clés secrètes.
 * ✅ RÉGLAGES : Respect strict de la devise, du mode test et du verrouillage admin.
 * ✅ RESTRICTIONS : Blocage si canBuyCourse est faux.
 */

import { randomUUID, randomBytes } from 'crypto';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Settings, Country, NdaraUser } from '@/lib/types';

export type MeSombResponse =
  | { success: true; type: 'REAL'; transactionId: string; message: string }
  | { success: true; type: 'SIMULATED'; message: string }
  | { success: false; error: string };

interface MeSombPaymentParams {
  amount: number;
  phoneNumber: string;
  service: 'ORANGE' | 'MTN' | 'WAVE';
  userId: string;
  type?: 'course_purchase' | 'wallet_topup';
  courseId?: string;
  affiliateId?: string;
  couponId?: string;
}

/** 🛡️ Limite le spam de requêtes de paiement */
async function checkUserVelocity(db: FirebaseFirestore.Firestore, userId: string) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentTxns = await db.collection('payments')
        .where('userId', '==', userId)
        .where('createdAt', '>=', Timestamp.fromDate(fiveMinutesAgo))
        .count()
        .get();
    
    return recentTxns.data().count < 5; 
}

/** 🇨🇲 Détecte l'opérateur camerounais basé sur le numéro */
function detectCameroonOperator(phone: string, currentService: string): 'ORANGE' | 'MTN' {
    const clean = phone.replace(/\D/g, '');
    const num = clean.length === 9 ? clean : clean.slice(-9);
    
    // MTN: 67, 68, 650-654
    if (/^6(7|8|5[0-4])/.test(num)) return 'MTN';
    // Orange: 69, 655-659
    if (/^6(9|5[5-9])/.test(num)) return 'ORANGE';
    
    return currentService as 'ORANGE' | 'MTN';
}

export async function initiateMeSombPayment(params: MeSombPaymentParams): Promise<MeSombResponse> {
  const SECRET_KEY = process.env.MESOMB_SECRET_KEY;
  const APPLICATION_KEY = process.env.MESOMB_APP_KEY;

  try {
    const db = getAdminDb();
    
    // 1. Charger les réglages admin et utilisateur
    const [settingsSnap, userSnap] = await Promise.all([
        db.collection('settings').doc('global').get(),
        db.collection('users').doc(params.userId).get()
    ]);

    const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as Settings;
    const userData = userSnap.data() as NdaraUser;

    // 🚫 VÉRIFICATION DES RESTRICTIONS
    if (userData.restrictions?.canBuyCourse === false && params.type === 'course_purchase') {
        return { success: false, error: "RESTRICTED: Votre compte fait l'objet de restrictions limitant les nouveaux achats." };
    }

    // 🧪 MODE TEST : Simulation PRIORITAIRE si configuré en admin
    if (settings?.payments?.paymentMode === 'test') {
        console.log("[MeSomb] Simulation active (Mode Test Admin)");
        return { 
            success: true, 
            type: 'SIMULATED', 
            message: "Simulation : Paiement validé automatiquement en mode test." 
        };
    }

    // 🛡️ MODE LIVE : Vérification des clés
    if (!SECRET_KEY || !APPLICATION_KEY) {
        return { 
            success: false, 
            error: "Configuration MeSomb manquante sur le serveur. Veuillez ajouter vos clés API dans Vercel/Firebase." 
        };
    }

    // 🛡️ VERROUILLAGE : MeSomb actif ?
    if (!settings?.payments?.mesombEnabled) {
        return { success: false, error: "Le service de paiement est actuellement désactivé." };
    }

    // 🛡️ RÉGULATION PAYS : Vérifier si MeSomb est autorisé pour le pays de l'utilisateur
    if (userData?.countryCode) {
        const countrySnap = await db.collection('countries').where('code', '==', userData.countryCode).limit(1).get();
        if (!countrySnap.empty) {
            const country = countrySnap.docs[0].data() as Country;
            const hasMeSomb = country.paymentMethods.some(m => m.provider === 'mesomb' && m.active);
            if (!hasMeSomb) return { success: false, error: "Ce mode de paiement n'est pas autorisé dans votre région." };
        }
    }

    // 2. Vérification vélocité
    const isVelocityOk = await checkUserVelocity(db, params.userId);
    if (!isVelocityOk) {
        return { success: false, error: "Trop de tentatives. Veuillez patienter 5 minutes." };
    }

    const internalRef = randomUUID();
    const secretNonce = randomBytes(32).toString('hex');
    const currency = settings?.commercial?.currency || 'XOF';
    
    // 3. Normalisation du numéro et correction opérateur (Cameroun)
    let cleanPhone = params.phoneNumber.replace(/\D/g, '');
    let finalService = params.service;

    if (cleanPhone.length >= 9) {
        const cameroonNum = cleanPhone.slice(-9);
        if (cameroonNum.startsWith('6')) {
            cleanPhone = '237' + cameroonNum;
            finalService = detectCameroonOperator(cameroonNum, params.service);
        }
    }

    // 4. Enregistrement de l'intention
    await db.collection('payments').doc(internalRef).set({
        id: internalRef,
        userId: params.userId,
        amount: Number(params.amount),
        currency,
        status: 'pending',
        provider: 'mesomb',
        type: params.type || 'course_purchase',
        courseId: params.courseId || 'WALLET_TOPUP',
        createdAt: FieldValue.serverTimestamp(),
        security: {
            nonce: secretNonce,
            attempts: 0
        },
        metadata: {
            affiliateId: params.affiliateId || null,
            couponId: params.couponId || null
        }
    });

    // 5. Appel API MeSomb
    const headers: HeadersInit = {
        'Authorization': `Bearer ${SECRET_KEY}`,
        'X-MeSomb-Application': APPLICATION_KEY,
        'Content-Type': 'application/json',
    };

    const response = await fetch('https://mesomb.hachther.com/api/v1.1/payment/collect', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: params.amount,
        service: finalService,
        receiver: cleanPhone,
        currency,
        nonce: randomBytes(16).toString('hex'),
        extra: {
          internalReference: internalRef,
          securityToken: secretNonce
        }
      }),
    });

    const data = await response.json();

    if (response.ok && (data.status === 'SUCCESS' || data.status === 'PENDING')) {
      return { 
        success: true, 
        type: 'REAL',
        transactionId: internalRef, 
        message: "Veuillez valider le paiement sur votre mobile." 
      };
    } else {
      const errorMsg = data.detail ? String(data.detail) : "Transaction refusée par l'opérateur.";
      await db.collection('payments').doc(internalRef).update({
          status: 'failed',
          error: errorMsg
      });
      return { success: false, error: errorMsg };
    }

  } catch (error: any) {
    console.error("[MeSomb Fatal Error]", error);
    return { success: false, error: "Connexion impossible avec la passerelle de paiement." };
  }
}
