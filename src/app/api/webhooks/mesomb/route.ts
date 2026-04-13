
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Webhook MeSomb sécurisé.
 * ✅ AUTH : Token Auth (Token API_KEY + X-MeSomb-Application).
 * ✅ PROD : Utilisation des clés de production Mathias.
 */

export async function POST(req: Request) {
  const requestId = `WH-MS-${Date.now()}`;
  console.log(`[${requestId}] 📨 Webhook MeSomb reçu.`);

  try {
    const APP_KEY = process.env.MESOMB_APP_KEY?.trim();
    const API_KEY = process.env.MESOMB_API_KEY?.trim();

    if (!APP_KEY || !API_KEY) {
        console.error(`[${requestId}] ❌ Config serveur manquante.`);
        return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const body = await req.json();
    const txnData = body.transaction || body;
    const extra = txnData.metadata || txnData.extra || body.extra;
    
    const internalRef = extra?.internalReference;
    const securityToken = extra?.securityToken;

    if (!internalRef || !securityToken) {
        console.error(`[${requestId}] ❌ Payload incomplet.`);
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = getAdminDb();
    const paymentDoc = await db.collection('payments').doc(internalRef).get();
    
    if (!paymentDoc.exists) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const storedData = paymentDoc.data();

    // 1. Validation du Jeton de sécurité (Anti-Spoofing)
    if (storedData?.security?.nonce !== securityToken) {
        return NextResponse.json({ error: 'Security breach' }, { status: 403 });
    }

    // 2. DOUBLE-VÉRIFICATION API (Back-check Token Auth)
    const gatewayId = txnData.pk || txnData.id || txnData.guid;
    
    const verifyRes = await fetch(`https://mesomb.hachther.com/api/v1.1/payment/status/?id=${gatewayId}`, {
        headers: {
            'Authorization': `Token ${API_KEY}`,
            'X-MeSomb-Application': APP_KEY,
        },
        cache: 'no-store'
    });

    if (!verifyRes.ok) {
        return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
    }

    const officialTxn = await verifyRes.json();

    if (officialTxn.status !== 'SUCCESS') {
        await db.collection('payments').doc(internalRef).update({
            status: 'failed',
            error: `MeSomb Status: ${officialTxn.status}`,
            updatedAt: new Date()
        });
        return NextResponse.json({ status: 'ignored', reason: officialTxn.status });
    }

    // 3. DÉCLENCHEMENT DU PROCESSEUR FINANCIER
    await processNdaraPayment({
      transactionId: internalRef,
      gatewayTransactionId: String(gatewayId),
      provider: 'mesomb',
      amount: Number(officialTxn.amount),
      currency: officialTxn.currency || 'XAF',
      metadata: {
        userId: storedData?.userId,
        courseId: storedData?.courseId,
        type: storedData?.type || 'course_purchase',
      }
    });

    return NextResponse.json({ processed: true });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ ERREUR WEBHOOK:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
