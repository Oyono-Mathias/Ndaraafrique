
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Webhook MeSomb Sécurisé.
 * ✅ ANTI-SPOOFING : Vérification de l'existence de la transaction dans Firestore.
 * ✅ INTÉGRITÉ : Comparaison des montants attendus vs reçus.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("🔔 Webhook MeSomb Reçu");

    const isSuccess = body.status === 'SUCCESS' || body.success === true;
    if (!isSuccess) return NextResponse.json({ status: 'ignored' });

    const txnData = body.transaction || body;
    const metadata = txnData.metadata || txnData.extra || body.extra;
    const internalRef = metadata?.internalReference;

    if (!internalRef) {
        console.error("❌ Erreur: Référence interne manquante dans le webhook");
        return NextResponse.json({ error: 'No reference' }, { status: 400 });
    }

    const db = getAdminDb();
    const paymentDoc = await db.collection('payments').doc(internalRef).get();

    // 🛡️ DOUBLE VÉRIFICATION CRITIQUE
    if (!paymentDoc.exists) {
        console.error(`❌ ALERTE SÉCURITÉ : Tentative de validation d'une transaction inconnue : ${internalRef}`);
        return NextResponse.json({ error: 'Fraud detected' }, { status: 403 });
    }

    const expectedData = paymentDoc.data();
    
    // Vérifier que le montant payé correspond au montant enregistré
    if (Number(txnData.amount) < Number(expectedData?.amount)) {
        console.error(`❌ ALERTE SÉCURITÉ : Montant incohérent pour ${internalRef}. Reçu: ${txnData.amount}, Attendu: ${expectedData?.amount}`);
        return NextResponse.json({ error: 'Amount mismatch' }, { status: 403 });
    }

    // Si tout est OK, on traite via le processeur central
    await processNdaraPayment({
      transactionId: internalRef, // On garde notre ID interne comme clé unique
      gatewayTransactionId: String(txnData.pk || txnData.id),
      provider: 'mesomb',
      amount: Number(txnData.amount),
      currency: txnData.currency || 'XAF',
      metadata: {
        userId: expectedData?.userId,
        courseId: expectedData?.courseId,
        type: expectedData?.type
      }
    });

    return NextResponse.json({ processed: true });

  } catch (error: any) {
    console.error('❌ WEBHOOK ERROR:', error.message);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
