import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';
import { fetchMeSomb } from '@/lib/mesomb';

/**
 * @fileOverview Webhook MeSomb sécurisé.
 * Reçoit les confirmations de paiement et valide la transaction via l'API officielle.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[Webhook MeSomb] Notification reçue:", JSON.stringify(body));

    // MeSomb envoie l'ID de transaction dans pk ou id
    const transaction = body.transaction || body;
    const gatewayId = transaction.pk || transaction.id;
    
    // Récupérer la référence interne Ndara (transmise lors de l'initiation)
    const extra = transaction.metadata || transaction.extra || body.extra;
    const internalRef = extra?.internalReference || extra?.external_id;

    if (!gatewayId) {
      console.error("[Webhook MeSomb] ID de transaction manquant dans le payload.");
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 🛡️ DOUBLE VÉRIFICATION DE SÉCURITÉ
    // On demande directement au serveur MeSomb le statut de cette transaction
    console.log(`[Webhook MeSomb] Vérification de la transaction ${gatewayId}...`);
    const officialTxn = await fetchMeSomb(`payment/status/?id=${gatewayId}`, 'GET');

    if (officialTxn.status !== 'SUCCESS') {
        console.warn(`[Webhook MeSomb] La transaction ${gatewayId} n'est pas marquée comme SUCCESS.`);
        return NextResponse.json({ status: 'ignored', mesomb_status: officialTxn.status });
    }

    // Si nous avons la référence interne, nous traitons le paiement
    // Sinon, nous utilisons l'ID MeSomb comme fallback
    const finalTransactionId = internalRef || `MESOMB-${gatewayId}`;

    const db = getAdminDb();
    const paymentDoc = await db.collection('payments').doc(finalTransactionId).get();
    
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
        console.error("[Webhook MeSomb] Impossible d'identifier l'utilisateur pour le crédit.");
        return NextResponse.json({ error: 'User mapping failed' }, { status: 400 });
    }

    // ✅ VALIDATION ET CRÉDIT DU WALLET VIA LE PROCESSEUR CENTRAL
    await processNdaraPayment({
      transactionId: finalTransactionId,
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

    console.log(`[Webhook MeSomb] Succès: Transaction ${gatewayId} traitée pour l'utilisateur ${userId}`);
    return NextResponse.json({ processed: true, transactionId: gatewayId });

  } catch (error: any) {
    console.error(`[Webhook MeSomb] Error:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
