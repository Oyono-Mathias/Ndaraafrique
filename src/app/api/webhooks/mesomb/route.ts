
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';
import { detectFraud } from '@/ai/flows/detect-fraud-flow';

/**
 * @fileOverview Webhook MeSomb Hardened.
 * ✅ STRATÉGIE : Zero-Trust + Secret Token Validation + IA Fraud Scoring.
 */

export async function POST(req: Request) {
  const SECRET_KEY = process.env.MESOMB_SECRET_KEY?.trim();
  const APP_KEY = process.env.MESOMB_APP_KEY?.trim();

  try {
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
    
    // 1. Vérification de l'existence et du Secret Nonce (Anti-Spoofing)
    const paymentDoc = await db.collection('payments').doc(internalRef).get();
    if (!paymentDoc.exists) {
        // Détecter une attaque par brute-force d'ID
        await db.collection('security_logs').add({
            eventType: 'webhook_brute_force_attempt',
            details: `ID inexistant tenté: ${internalRef}`,
            timestamp: new Date()
        });
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const storedData = paymentDoc.data();
    if (storedData?.security?.nonce !== securityToken) {
        await db.collection('security_logs').add({
            eventType: 'webhook_token_mismatch',
            userId: storedData?.userId,
            details: `Token invalide reçu pour ${internalRef}`,
            timestamp: new Date()
        });
        return NextResponse.json({ error: 'Invalid Token' }, { status: 403 });
    }

    // 2. Double-Vérification API (Source of Truth)
    const verifyRes = await fetch(`https://mesomb.hachther.com/api/v1.1/payment/status/?id=${txnData.pk || txnData.id}`, {
        headers: {
            'Authorization': `Bearer ${SECRET_KEY}`,
            'X-MeSomb-Application': APP_KEY,
        }
    });

    if (!verifyRes.ok) return NextResponse.json({ error: 'Auth failed' }, { status: 403 });
    const officialTxn = await verifyRes.json();

    if (officialTxn.status !== 'SUCCESS') return NextResponse.json({ status: 'ignored' });

    // 3. Analyse Anti-Fraude par IA Mathias
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

    // 4. Blocage si risque trop élevé (> 80)
    if (fraudAnalysis.riskScore > 80) {
        await db.collection('security_logs').add({
            eventType: 'fraud_blocked',
            userId: storedData?.userId,
            details: `Transaction bloquée par IA. Score: ${fraudAnalysis.riskScore}. Raison: ${fraudAnalysis.reason}`,
            timestamp: new Date()
        });
        return NextResponse.json({ error: 'Fraud detected' }, { status: 403 });
    }

    // 5. Validation finale
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
    console.error("❌ Erreur critique Webhook:", error.message);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
