
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';
import { fetchMeSomb } from '@/lib/mesomb';

/**
 * @fileOverview Webhook MeSomb sécurisé Ndara Afrique.
 * ✅ AUTH : Utilise le client centralisé fetchMeSomb pour le back-check.
 */

export async function POST(req: Request) {
  const requestId = `WH-MS-${Date.now()}`;
  console.log(`[${requestId}] 📨 Webhook MeSomb reçu.`);

  try {
    const body = await req.json();
    const txnData = body.transaction || body;
    const extra = txnData.metadata || txnData.extra || body.extra;
    
    const internalRef = extra?.internalReference;
    const securityToken = extra?.securityToken;

    if (!internalRef || !securityToken) {
        console.error(`[${requestId}] ❌ Payload incomplet (Missing internalRef/securityToken).`);
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = getAdminDb();
    const paymentDoc = await db.collection('payments').doc(internalRef).get();
    
    if (!paymentDoc.exists) {
        console.error(`[${requestId}] ❌ Transaction ${internalRef} introuvable en DB.`);
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const storedData = paymentDoc.data();

    // 1. Validation du Jeton de sécurité (Anti-Spoofing)
    if (storedData?.security?.nonce !== securityToken) {
        console.error(`[${requestId}] ❌ Violation de sécurité : Jeton invalide.`);
        return NextResponse.json({ error: 'Security breach' }, { status: 403 });
    }

    // 2. DOUBLE-VÉRIFICATION API (Back-check sécurisé)
    const gatewayId = txnData.pk || txnData.id || txnData.guid;
    
    console.log(`[${requestId}] 🔍 Lancement de la vérification API pour ${gatewayId}`);

    const officialTxn = await fetchMeSomb(`payment/status/?id=${gatewayId}`);

    if (officialTxn.status !== 'SUCCESS') {
        console.log(`[${requestId}] ℹ️ Transaction non-réussie chez MeSomb : ${officialTxn.status}`);
        await db.collection('payments').doc(internalRef).update({
            status: 'failed',
            error: `MeSomb Status: ${officialTxn.status}`,
            updatedAt: new Date()
        });
        return NextResponse.json({ status: 'ignored', reason: officialTxn.status });
    }

    // 3. DÉCLENCHEMENT DU PROCESSEUR FINANCIER NDARA
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

    console.log(`[${requestId}] ✅ Paiement validé et crédité.`);
    return NextResponse.json({ processed: true });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ ERREUR WEBHOOK CRITIQUE:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
