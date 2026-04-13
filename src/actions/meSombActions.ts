
'use server';

/**
 * @fileOverview Initiation sécurisée des paiements MeSomb et consultation du solde.
 * ✅ AUTH : Passage au format Token Auth (X-MeSomb-Application + Token API_KEY).
 * ✅ GÉO : Optimisation pour le Cameroun (+237 / XAF).
 * ✅ FIX : Correction de l'URL de balance et résilience face aux réponses non-JSON.
 */

import { randomUUID, randomBytes } from 'crypto';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { NdaraUser } from '@/lib/types';

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
}

/**
 * 💰 Récupérer le solde réel du compte marchand MeSomb (Action Admin)
 */
export async function getMeSombBalanceAction(adminId: string): Promise<{ success: boolean; balance?: number; currency?: string; error?: string }> {
    try {
        const db = getAdminDb();
        const adminDoc = await db.collection('users').doc(adminId).get();
        
        if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
            throw new Error("UNAUTHORIZED: Droits d'administrateur requis.");
        }

        const APP_KEY = process.env.MESOMB_APP_KEY?.trim();
        const API_KEY = process.env.MESOMB_API_KEY?.trim();

        if (!APP_KEY || !API_KEY) {
            throw new Error("Configuration MeSomb manquante (API_KEY ou APP_KEY).");
        }

        // ✅ URL corrigée avec slash final et gestion de réponse robuste
        const response = await fetch('https://mesomb.hachther.com/api/v1.1/payment/balance/', {
            method: 'GET',
            headers: {
                'Authorization': `Token ${API_KEY}`,
                'X-MeSomb-Application': APP_KEY,
                'accept': 'application/json',
            },
            cache: 'no-store'
        });

        const contentType = response.headers.get('content-type');
        
        if (!response.ok) {
            if (contentType && contentType.includes('application/json')) {
                const errData = await response.json();
                throw new Error(errData.detail || errData.message || `Erreur MeSomb (${response.status})`);
            } else {
                // Si on reçoit du HTML, c'est que les clés ou l'URL sont invalides
                throw new Error(`Le service MeSomb est inaccessible ou vos clés API sont invalides (Erreur ${response.status}).`);
            }
        }

        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            return { 
                success: true, 
                balance: data.balance, 
                currency: data.currency || 'XAF' 
            };
        } else {
            throw new Error("Réponse API invalide : MeSomb n'a pas renvoyé de données JSON.");
        }

    } catch (error: any) {
        console.error("[MeSomb Balance Error]:", error.message);
        return { success: false, error: error.message };
    }
}

export async function initiateMeSombPayment(params: MeSombPaymentParams): Promise<MeSombResponse> {
  const APP_KEY = process.env.MESOMB_APP_KEY?.trim();
  const API_KEY = process.env.MESOMB_API_KEY?.trim();

  try {
    const db = getAdminDb();
    
    // 1. Charger les réglages
    const [settingsSnap, userSnap] = await Promise.all([
        db.collection('settings').doc('global').get(),
        db.collection('users').doc(params.userId).get()
    ]);

    const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as any;
    const userData = userSnap.data() as NdaraUser;

    if (!userData) return { success: false, error: "Utilisateur introuvable." };

    // 2. Mode Simulation
    if (settings?.payments?.paymentMode === 'test') {
        return { 
            success: true, 
            type: 'SIMULATED', 
            message: "Mode TEST : Votre paiement a été validé sans débit réel." 
        };
    }

    // 3. Validation Configuration
    if (!APP_KEY || !API_KEY) {
        return { success: false, error: "Le service de paiement n'est pas configuré sur ce serveur." };
    }

    // 4. Préparation du numéro (Standard Cameroun +237)
    let cleanPhone = params.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length === 9 && (cleanPhone.startsWith('6') || cleanPhone.startsWith('2'))) {
        cleanPhone = '237' + cleanPhone;
    }

    const internalRef = randomUUID();
    const secretNonce = randomBytes(32).toString('hex');
    const currency = 'XAF'; 

    // 5. Appel API Collect
    const payload = {
        amount: params.amount,
        service: params.service, 
        receiver: cleanPhone,
        currency: currency,
        nonce: randomBytes(16).toString('hex'),
        extra: { 
            internalReference: internalRef, 
            securityToken: secretNonce 
        }
    };

    const response = await fetch('https://mesomb.hachther.com/api/v1.1/payment/collect/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${API_KEY}`,
        'X-MeSomb-Application': APP_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type');
    if (!response.ok) {
        if (contentType && contentType.includes('application/json')) {
            const errData = await response.json();
            return { success: false, error: errData.detail || errData.message || "Transaction refusée." };
        }
        return { success: false, error: "Impossible de contacter MeSomb." };
    }

    const data = await response.json();

    // Enregistrement de la transaction en attente
    await db.collection('payments').doc(internalRef).set({
        id: internalRef,
        userId: params.userId,
        amount: Number(params.amount),
        currency,
        status: 'pending',
        provider: 'mesomb',
        type: params.type || 'course_purchase',
        courseId: params.courseId || 'WALLET_TOPUP',
        courseTitle: params.type === 'wallet_topup' ? 'Recharge Portefeuille' : 'Achat formation',
        createdAt: FieldValue.serverTimestamp(),
        security: { nonce: secretNonce },
        metadata: { operator: params.service, phone: cleanPhone }
    });

    return { 
        success: true, 
        type: 'REAL', 
        transactionId: internalRef, 
        message: "Veuillez valider l'opération sur votre téléphone." 
    };

  } catch (error: any) {
    console.error("[MeSomb Fatal Error]:", error.message);
    return { success: false, error: "Connexion impossible avec la passerelle de paiement." };
  }
}
