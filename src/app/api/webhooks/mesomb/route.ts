import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';
import { fetchMeSomb } from '@/lib/mesomb';

/**
 * @fileOverview Webhook MeSomb sécurisé par Double-Signature.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const txnData = body.transaction || body;
    const extra = txnData.metadata || txnData.extra || body.extra;
    const internalRef = extra?.internalReference;

    if (!internalRef) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const db = getAdminDb();
    const paymentDoc = await db.collection('payments').doc(internalRef).get();
    if (!paymentDoc.exists) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

    const storedData = paymentDoc.data();

    // 🛡️ VÉRIFICATION DE SÉCURITÉ : On demande au serveur MeSomb le statut via Signature
    const gatewayId = txnData.pk || txnData.id;
    const officialTxn = await fetchMeSomb(`payment/status/?id=${gatewayId}`, 'GET');

    if (officialTxn.status !== 'SUCCESS') {
        await db.collection('payments').doc(internalRef).update({
            status: 'failed',
            error: `Status: ${officialTxn.status}`,
            updatedAt: new Date()
        });
        return NextResponse.json({ status: 'ignored' });
    }

    // ✅ VALIDATION ET CRÉDIT DU WALLET
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
    console.error(`[Webhook MeSomb] Error:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
