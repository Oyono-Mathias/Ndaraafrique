
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';
import { fetchMeSomb } from '@/lib/mesomb';

/**
 * @fileOverview Webhook MeSomb sécurisé Ndara Afrique.
 * ✅ VALIDATION : Utilise le client de signature HMAC pour vérifier le statut réel.
 */

export async function POST(req: Request) {
  const requestId = `WH-MS-${Date.now()}`;
  console.log(`[${requestId}] Webhook MeSomb reçu.`);

  try {
    const body = await req.json();
    const txnData = body.transaction || body;
    const extra = txnData.metadata || txnData.extra || body.extra;
    
    // Récupération de notre référence interne
    const internalRef = extra?.internalReference;

    if (!internalRef) {
        console.error(`[${requestId}] Error: Missing internalReference in webhook payload.`);
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = getAdminDb();
    const paymentDoc = await db.collection('payments').doc(internalRef).get();
    
    if (!paymentDoc.exists) {
        console.error(`[${requestId}] Transaction ${internalRef} introuvable dans Firestore.`);
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const storedData = paymentDoc.data();

    // 🛡️ DOUBLE-VÉRIFICATION SÉCURISÉE (Back-check API avec Signature HMAC)
    const gatewayId = txnData.pk || txnData.id || txnData.guid;
    const officialTxn = await fetchMeSomb(`payment/status/?id=${gatewayId}`, 'GET');

    if (officialTxn.status !== 'SUCCESS') {
        console.log(`[${requestId}] Transaction non-réussie selon l'API MeSomb : ${officialTxn.status}`);
        await db.collection('payments').doc(internalRef).update({
            status: 'failed',
            error: `MeSomb Status: ${officialTxn.status}`,
            updatedAt: new Date()
        });
        return NextResponse.json({ status: 'ignored' });
    }

    // ✅ DÉCLENCHEMENT DU PROCESSEUR FINANCIER NDARA
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

    console.log(`[${requestId}] ✅ Paiement validé et traité.`);
    return NextResponse.json({ processed: true });

  } catch (error: any) {
    console.error(`[${requestId}] Webhook Error:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
