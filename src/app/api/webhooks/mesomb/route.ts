import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';
import { detectFraud } from '@/ai/flows/detect-fraud-flow';
import { getRequiredEnv } from '@/lib/env';

/**
 * @fileOverview Webhook MeSomb Hardened pour la Production.
 * ✅ SÉCURITÉ : Double vérification API (Pull) + Validation Nonce + IA Anti-Fraude.
 * ✅ FIABILITÉ : Logs détaillés pour monitoring Vercel.
 */

export async function POST(req: Request) {
  const requestId = `WEBHOOK-${Date.now()}`;
  console.log(`[${requestId}] 📨 Webhook MeSomb reçu.`);

  try {
    const SECRET_KEY = getRequiredEnv('MESOMB_SECRET_KEY');
    const APP_KEY = getRequiredEnv('MESOMB_APP_KEY');

    const body = await req.json();
    console.log(`[${requestId}] 📦 Body:`, JSON.stringify(body));

    // MeSomb envoie les données soit dans 'transaction', soit à la racine
    const txnData = body.transaction || body;
    const extra = txnData.metadata || txnData.extra || body.extra;
    
    const internalRef = extra?.internalReference;
    const securityToken = extra?.securityToken;

    if (!internalRef || !securityToken) {
        console.error(`[${requestId}] ❌ Erreur: Références de sécurité manquantes dans le body.`);
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    
    // 1. Récupération de l'intention de paiement en base
    console.log(`[${requestId}] 🔍 Recherche de la transaction: ${internalRef}`);
    const paymentDoc = await db.collection('payments').doc(internalRef).get();
    
    if (!paymentDoc.exists) {
        console.error(`[${requestId}] ❌ Transaction non trouvée en base.`);
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const storedData = paymentDoc.data();

    // 2. Validation du Token de sécurité (Anti-Spoofing)
    if (storedData?.security?.nonce !== securityToken) {
        console.error(`[${requestId}] 🚨 ALERTE: Token de sécurité invalide (Mismatch).`);
        await db.collection('security_logs').add({
            eventType: 'webhook_token_mismatch',
            userId: storedData?.userId,
            details: `Tentative de spoofing webhook détectée pour ${internalRef}`,
            timestamp: new Date()
        });
        return NextResponse.json({ error: 'Invalid Token' }, { status: 403 });
    }

    // 3. DOUBLE-VÉRIFICATION API (Callback au serveur MeSomb)
    // Nous ne croyons pas le body reçu, nous demandons la vérité à MeSomb
    const gatewayId = txnData.pk || txnData.id;
    console.log(`[${requestId}] 📡 Vérification officielle MeSomb pour ID: ${gatewayId}`);

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
        console.error(`[${requestId}] ❌ Échec de la vérification API MeSomb: ${verifyRes.status}`);
        return NextResponse.json({ error: 'Gateway verification failed' }, { status: 403 });
    }

    const officialTxn = await verifyRes.json();
    console.log(`[${requestId}] 📑 Statut officiel MeSomb: ${officialTxn.status}`);

    if (officialTxn.status !== 'SUCCESS') {
        console.warn(`[${requestId}] ⚠️ Transaction non réussie (Statut: ${officialTxn.status}). Ignorée.`);
        return NextResponse.json({ status: 'ignored', reason: officialTxn.status });
    }

    // 4. ANALYSE ANTI-FRAUDE PAR IA MATHIAS
    const userDoc = await db.collection('users').doc(storedData?.userId).get();
    const userData = userDoc.data();
    
    console.log(`[${requestId}] 🧠 Lancement analyse anti-fraude IA...`);
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

    if (fraudAnalysis.riskScore > 85) {
        console.error(`[${requestId}] 🛑 Blocage FRAUDE détecté par IA. Score: ${fraudAnalysis.riskScore}`);
        await db.collection('security_logs').add({
            eventType: 'fraud_blocked',
            userId: storedData?.userId,
            details: `Transaction bloquée par IA. Score: ${fraudAnalysis.riskScore}. Raison: ${fraudAnalysis.reason}`,
            timestamp: new Date()
        });
        return NextResponse.json({ error: 'Fraud detected' }, { status: 403 });
    }

    // 5. VALIDATION FINALE ET CRÉDIT WALLET (Atomique)
    console.log(`[${requestId}] ✅ Validation finale. Crédit du wallet pour user: ${storedData?.userId}`);
    await processNdaraPayment({
      transactionId: internalRef,
      gatewayTransactionId: String(gatewayId),
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

    console.log(`[${requestId}] 🏁 Webhook traité avec succès.`);
    return NextResponse.json({ processed: true, riskScore: fraudAnalysis.riskScore });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ ERREUR CRITIQUE WEBHOOK:`, error.message);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
