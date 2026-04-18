import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';
import { fetchMeSomb } from '@/lib/mesomb';

/**
 * @fileOverview Webhook MeSomb sécurisé (Reset Token Auth).
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[Webhook MeSomb] Notification reçue:", JSON.stringify(body));

    const transaction = body.transaction || body;
    const gatewayId = transaction.pk || transaction.id;
    
    if (!gatewayId) {
      console.error("[Webhook MeSomb] ID de transaction manquant.");
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 🛡️ DOUBLE VÉRIFICATION DE SÉCURITÉ
    console.log(`[Webhook MeSomb] Back-check de la transaction ${gatewayId}...`);
    
    // ✅ CORRECTION APPEL : 2 arguments (endpoint, options)
    const officialTxn = await fetchMeSomb(`payment/status/?id=${gatewayId}`, {
      method: 'GET'
    });

    if (officialTxn.status !== 'SUCCESS') {
        console.warn(`[Webhook MeSomb] Transaction ${gatewayId} non validée par MeSomb.`);
        return NextResponse.json({ status: 'ignored' });
    }

    const extra = transaction.metadata || transaction.extra || body.extra;
    const internalRef = extra?.internalReference || extra?.external_id || `MESOMB-${gatewayId}`;

    const db = getAdminDb();
    const paymentDoc = await db.collection('payments').doc(internalRef).get();
    
    let userId = officialTxn.customer?.id || officialTxn.external_id;
    let courseId = 'WALLET_TOPUP';
    let type = 'wallet_topup';

    if (paymentDoc.exists) {
        const storedData = paymentDoc.data();
        userId = storedData?.userId;
        courseId = storedData?.courseId;
        type = storedData?.type || 'course_purchase';
    }

    if (!userId) {
        return NextResponse.json({ error: 'User identification failed' }, { status: 400 });
    }

    // VALIDATION FINALE
    await processNdaraPayment({
      transactionId: internalRef,
      gatewayTransactionId: String(gatewayId),
      provider: 'mesomb',
      amount: Number(officialTxn.amount),
      currency: officialTxn.currency || 'XAF',
      metadata: {
        userId,
        courseId,
        type,
        operator: officialTxn.service
      }
    });

    return NextResponse.json({ processed: true, transactionId: gatewayId });

  } catch (error: any) {
    console.error(`[Webhook MeSomb] Error:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
