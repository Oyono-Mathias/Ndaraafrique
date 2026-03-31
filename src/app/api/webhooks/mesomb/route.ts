import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Webhook MeSomb avec Double-Vérification.
 * ✅ ANTI-SPOOFING : On demande à MeSomb de confirmer le statut via leur API.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const SECRET_KEY = process.env.MESOMB_SECRET_KEY?.trim();
    const APP_KEY = process.env.MESOMB_APP_KEY?.trim();

    const txnData = body.transaction || body;
    const metadata = txnData.metadata || txnData.extra || body.extra;
    const internalRef = metadata?.internalReference;

    if (!internalRef) return NextResponse.json({ error: 'Missing ref' }, { status: 400 });

    // 🛡️ SÉCURITÉ ABSOLUE : On ne croit pas le body. 
    // On appelle l'API MeSomb pour vérifier cette transaction précise.
    const verifyRes = await fetch(`https://mesomb.hachther.com/api/v1.1/payment/status/?id=${txnData.pk || txnData.id}`, {
        headers: {
            'Authorization': `Bearer ${SECRET_KEY}`,
            'X-MeSomb-Application': APP_KEY,
        }
    });

    if (!verifyRes.ok) {
        console.error("❌ Impossible de vérifier la transaction auprès de MeSomb");
        return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
    }

    const officialTxn = await verifyRes.json();

    if (officialTxn.status !== 'SUCCESS') {
        return NextResponse.json({ status: 'not_completed_on_gateway' });
    }

    // On récupère notre document attendu
    const db = getAdminDb();
    const paymentDoc = await db.collection('payments').doc(internalRef).get();

    if (!paymentDoc.exists) {
        console.error(`🚨 ALERTE FRAUDE : Transaction inconnue tentée : ${internalRef}`);
        return NextResponse.json({ error: 'Unknown transaction' }, { status: 403 });
    }

    const expected = paymentDoc.data();

    // Comparaison des montants (Important)
    if (Number(officialTxn.amount) < Number(expected?.amount)) {
        console.error("🚨 ALERTE FRAUDE : Montant payé inférieur au montant attendu");
        return NextResponse.json({ error: 'Amount mismatch' }, { status: 403 });
    }

    // Tout est vérifié à la source -> Crédit final
    await processNdaraPayment({
      transactionId: internalRef,
      gatewayTransactionId: String(officialTxn.pk || officialTxn.id),
      provider: 'mesomb',
      amount: Number(officialTxn.amount),
      currency: officialTxn.currency,
      metadata: {
        userId: expected?.userId,
        courseId: expected?.courseId,
        type: expected?.type
      }
    });

    return NextResponse.json({ processed: true });

  } catch (error: any) {
    console.error('❌ FATAL WEBHOOK ERROR:', error.message);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
