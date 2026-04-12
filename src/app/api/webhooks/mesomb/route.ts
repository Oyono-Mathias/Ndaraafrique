import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Webhook MeSomb durci.
 * ✅ SÉCURITÉ : Double vérification (Back-check) via l'API MeSomb avec Basic Auth.
 * ✅ INTÉGRITÉ : Utilise le processeur de paiement centralisé.
 */

export async function POST(req: Request) {
  const requestId = `WEBHOOK-MS-${Date.now()}`;
  console.log(`[${requestId}] 📨 Webhook MeSomb reçu.`);

  try {
    const SECRET_KEY = process.env.MESOMB_SECRET_KEY;
    const ACCESS_KEY = process.env.MESOMB_ACCESS_KEY;

    if (!SECRET_KEY || !ACCESS_KEY) {
        return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
    }

    const body = await req.json();
    
    // MeSomb envoie les métadonnées dans 'transaction.extra' ou directement dans 'extra'
    const txnData = body.transaction || body;
    const extra = txnData.metadata || txnData.extra || body.extra;
    
    const internalRef = extra?.internalReference;
    const securityToken = extra?.securityToken;

    if (!internalRef || !securityToken) {
        console.error(`[${requestId}] ❌ Références manquantes dans le payload.`);
        return NextResponse.json({ error: 'Missing references' }, { status: 400 });
    }

    const db = getAdminDb();
    const paymentDoc = await db.collection('payments').doc(internalRef).get();
    
    if (!paymentDoc.exists) {
        console.error(`[${requestId}] ❌ Paiement ${internalRef} non trouvé en base.`);
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const storedData = paymentDoc.data();

    // 1. Validation du Jeton (Anti-Spoofing)
    if (storedData?.security?.nonce !== securityToken) {
        console.error(`[${requestId}] 🚨 ALERTE : Nonce Mismatch. Tentative de fraude possible.`);
        await db.collection('security_logs').add({
            eventType: 'webhook_token_mismatch',
            userId: storedData?.userId,
            details: `Nonce mismatch pour ${internalRef}. Reçu: ${securityToken}`,
            timestamp: new Date()
        });
        return NextResponse.json({ error: 'Invalid security token' }, { status: 403 });
    }

    // 2. DOUBLE-VÉRIFICATION API (Back-check vers MeSomb avec Basic Auth)
    const credentials = `${ACCESS_KEY.trim()}:${SECRET_KEY.trim()}`;
    const encoded = Buffer.from(credentials).toString('base64');

    const gatewayId = txnData.pk || txnData.id || txnData.guid;
    
    const verifyRes = await fetch(`https://mesomb.hachther.com/api/v1.1/payment/status/?id=${gatewayId}`, {
        headers: {
            'Authorization': `Basic ${encoded}`,
        }
    });

    if (!verifyRes.ok) {
        console.error(`[${requestId}] ❌ Impossible de vérifier le statut auprès de MeSomb. Status: ${verifyRes.status}`);
        return NextResponse.json({ error: 'MeSomb verification failed' }, { status: 403 });
    }

    const officialTxn = await verifyRes.json();

    if (officialTxn.status !== 'SUCCESS') {
        console.log(`[${requestId}] ℹ️ Statut final non-succès : ${officialTxn.status}`);
        await db.collection('payments').doc(internalRef).update({
            status: 'failed',
            error: `Statut final: ${officialTxn.status}`,
            updatedAt: new Date()
        });
        return NextResponse.json({ status: 'ignored', reason: officialTxn.status });
    }

    // 3. VALIDATION FINALE ET ATTRIBUTION DES DROITS
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
      }
    });

    console.log(`[${requestId}] ✅ Paiement ${internalRef} validé avec succès.`);
    return NextResponse.json({ processed: true });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ ERREUR WEBHOOK CRITIQUE:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}