import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';
import { detectFraud } from '@/ai/flows/detect-fraud-flow';
import { getRequiredEnv } from '@/lib/env';

/**
 * @fileOverview Webhook MeSomb Hardened.
 * ✅ STRATÉGIE : Zero-Trust + Double vérification API officielle + Typage strict.
 */

export async function POST(req: Request) {
  try {
    // 1. Récupération sécurisée des clés (Fail-fast si manquantes en production)
    const SECRET_KEY = getRequiredEnv('MESOMB_SECRET_KEY');
    const APP_KEY = getRequiredEnv('MESOMB_APP_KEY');

    const body = await req.json();
    const txnData = body.transaction || body;
    const extra = txnData.metadata || txnData.extra || body.extra;
    
    const internalRef = extra?.internalReference;
    const securityToken = extra?.securityToken;

    if (!internalRef || !securityToken) {
        console.error("🚨 Requête Webhook invalide (Tokens manquants).");
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    
    // 2. Vérification de l'existence et du Secret Nonce
    const paymentDoc = await db.collection('payments').doc(internalRef).get();
    if (!paymentDoc.exists) {
        await db.collection('security_logs').add({
            eventType: 'webhook_not_found',
            details: `ID transaction inexistant: ${internalRef}`,
            timestamp: new Date()
        });
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const storedData = paymentDoc.data();
    if (storedData?.security?.nonce !== securityToken) {
        await db.collection('security_logs').add({
            eventType: 'webhook_token_mismatch',
            userId: storedData?.userId,
            details: `Token de sécurité invalide pour ${internalRef}`,
            timestamp: new Date()
        });
        return NextResponse.json({ error: 'Invalid Token' }, { status: 403 });
    }

    // 3. Double-Vérification API (Source of Truth)
    // ✅ Typage strict des headers pour éviter les erreurs 'string | undefined'
    const headers: HeadersInit = {
        'Authorization': `Bearer ${SECRET_KEY}`,
        'X-MeSomb-Application': APP_KEY,
        'Content-Type': 'application/json'
    };

    const verifyRes = await fetch(`https://mesomb.hachther.com/api/v1.1/payment/status/?id=${txnData.pk || txnData.id}`, {
        headers
    });

    if (!verifyRes.ok) {
        console.error(`[MeSomb] Échec vérification API: ${verifyRes.status}`);
        return NextResponse.json({ error: 'Gateway verification failed' }, { status: 403 });
    }

    const officialTxn = await verifyRes.json();

    if (officialTxn.status !== 'SUCCESS') {
        return NextResponse.json({ status: 'ignored', reason: officialTxn.status });
    }

    // 4. Analyse Anti-Fraude par IA Mathias
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

    // 5. Blocage si risque critique
    if (fraudAnalysis.riskScore > 85) {
        await db.collection('security_logs').add({
            eventType: 'fraud_blocked',
            userId: storedData?.userId,
            details: `Transaction bloquée par IA. Score: ${fraudAnalysis.riskScore}. Raison: ${fraudAnalysis.reason}`,
            timestamp: new Date()
        });
        return NextResponse.json({ error: 'Fraud detected' }, { status: 403 });
    }

    // 6. Validation finale atomique
    await processNdaraPayment({
      transactionId: internalRef,
      gatewayTransactionId: String(officialTxn.pk || officialTxn.id),
      provider: 'mesomb',
      amount: Number(officialTxn.amount),
      currency: officialTxn.currency,
      metadata: {
        userId: storedData?.userId,
        courseId: storedData?.courseId,
        type: storedData?.type,
        fraudScore: fraudAnalysis.riskScore
      }
    });

    return NextResponse.json({ processed: true, riskScore: fraudAnalysis.riskScore });

  } catch (error: any) {
    console.error("❌ Erreur critique Webhook MeSomb:", error.message);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
