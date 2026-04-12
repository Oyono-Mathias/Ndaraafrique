import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';
import { detectFraud } from '@/ai/flows/detect-fraud-flow';
import { getRequiredEnv } from '@/lib/env';

/**
 * @fileOverview Webhook MeSomb durci pour la Production.
 * ✅ SÉCURITÉ : Double vérification API et analyse anti-fraude.
 */

export async function POST(req: Request) {
  const requestId = `WEBHOOK-MS-${Date.now()}`;
  console.log(`[${requestId}] 📨 Webhook MeSomb reçu.`);

  try {
    const SECRET_KEY = getRequiredEnv('MESOMB_SECRET_KEY');
    const APP_KEY = getRequiredEnv('MESOMB_APP_KEY');

    const body = await req.json();
    
    // MeSomb envoie les données soit dans 'transaction', soit à la racine
    const txnData = body.transaction || body;
    const extra = txnData.metadata || txnData.extra || body.extra;
    
    const internalRef = extra?.internalReference;
    const securityToken = extra?.securityToken;

    if (!internalRef || !securityToken) {
        console.error(`[${requestId}] ❌ Références manquantes.`);
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    const paymentDoc = await db.collection('payments').doc(internalRef).get();
    
    if (!paymentDoc.exists) {
        console.error(`[${requestId}] ❌ Paiement ${internalRef} non trouvé.`);
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const storedData = paymentDoc.data();

    // 1. Validation du Jeton (Anti-Spoofing)
    if (storedData?.security?.nonce !== securityToken) {
        console.error(`[${requestId}] 🚨 ALERTE: Nonce Mismatch.`);
        await db.collection('security_logs').add({
            eventType: 'webhook_token_mismatch',
            userId: storedData?.userId,
            details: `Tentative de spoofing détectée pour le paiement ${internalRef}`,
            timestamp: new Date()
        });
        return NextResponse.json({ error: 'Invalid Token' }, { status: 403 });
    }

    // 2. DOUBLE-VÉRIFICATION API (Callback à MeSomb pour confirmation finale)
    const gatewayId = txnData.pk || txnData.id;
    const headers: HeadersInit = {
        'Authorization': `Bearer ${SECRET_KEY}`,
        'X-MeSomb-Application': APP_KEY,
        'Content-Type': 'application/json'
    };

    const verifyRes = await fetch(`https://mesomb.hachther.com/api/v1.1/payment/status/?id=${gatewayId}`, {
        headers,
        next: { revalidate: 0 }
    });

    if (!verifyRes.ok) {
        return NextResponse.json({ error: 'Gateway verification failed' }, { status: 403 });
    }

    const officialTxn = await verifyRes.json();

    if (officialTxn.status !== 'SUCCESS') {
        return NextResponse.json({ status: 'ignored', reason: officialTxn.status });
    }

    // 3. ANALYSE ANTI-FRAUDE IA (Optionnelle mais recommandée)
    let riskScore = 0;
    try {
        const userDoc = await db.collection('users').doc(storedData?.userId).get();
        const userData = userDoc.data();
        
        const fraudAnalysis = await detectFraud({
            transactionId: internalRef,
            amount: Number(officialTxn.amount),
            courseTitle: storedData?.courseId || 'Recharge',
            user: {
                id: storedData?.userId,
                accountAgeInSeconds: Math.floor((Date.now() - (userData?.createdAt?.toDate().getTime() || Date.now())) / 1000),
                isFirstTransaction: (userData?.affiliateStats?.sales || 0) === 0,
                emailDomain: userData?.email?.split('@')[1] || ''
            }
        });
        riskScore = fraudAnalysis.riskScore;

        if (riskScore > 85) {
            await db.collection('security_logs').add({
                eventType: 'fraud_blocked',
                userId: storedData?.userId,
                details: `Paiement bloqué par IA (Score: ${riskScore}). Raison: ${fraudAnalysis.reason}`,
                timestamp: new Date()
            });
            return NextResponse.json({ error: 'Fraud detected' }, { status: 403 });
        }
    } catch (e) {
        console.warn(`[${requestId}] ⚠️ Fraud analysis skipped:`, e);
    }

    // 4. VALIDATION FINALE ET DISTRIBUTION DES DROITS (Atomique)
    await processNdaraPayment({
      transactionId: internalRef,
      gatewayTransactionId: String(gatewayId),
      provider: 'mesomb',
      amount: Number(officialTxn.amount),
      currency: officialTxn.currency || 'XOF',
      metadata: {
        userId: storedData?.userId,
        courseId: storedData?.courseId,
        type: storedData?.type || 'course_purchase',
        fraudScore: riskScore
      }
    });

    console.log(`[${requestId}] ✅ Paiement ${internalRef} validé avec succès.`);
    return NextResponse.json({ processed: true, riskScore });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ ERREUR WEBHOOK CRITIQUE:`, error.message);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
