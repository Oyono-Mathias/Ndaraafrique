import { NextResponse } from 'next/server';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Webhook MeSomb Ndara V4.
 * ✅ FIX : Gestion dynamique XAF/XOF.
 * ✅ ROBUSTESSE : Mapping flexible des données MeSomb.
 * ✅ SÉCURITÉ : Logs d'erreurs enrichis pour le débogage.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("🔔 WEBHOOK RECEIVE:", JSON.stringify(body));

    // 1. Détection du succès (MeSomb envoie SUCCESS ou success: true)
    const isSuccess = body.status === 'SUCCESS' || body.success === true;

    if (isSuccess) {
      // MeSomb peut mettre les infos à la racine ou dans un objet transaction
      const txnData = body.transaction || body;
      
      // Extraction des métadonnées (ce qu'on a envoyé lors de l'initiation)
      const metadata = txnData.metadata || txnData.extra || body.extra;

      if (!metadata?.userId) {
          console.error("❌ WEBHOOK ERROR: userId manquant dans les métadonnées", metadata);
          return NextResponse.json({ error: 'User ID missing' }, { status: 400 });
      }

      // 2. Traitement du paiement vers Firestore
      // On s'assure que le montant et la devise sont bien captés
      await processNdaraPayment({
        transactionId: String(txnData.pk || txnData.id || `MS-${Date.now()}`),
        gatewayTransactionId: String(txnData.pk || txnData.id),
        provider: 'mesomb',
        amount: Number(txnData.amount),
        currency: txnData.currency || 'XAF', // Par défaut XAF pour le Cameroun
        metadata: {
          userId: metadata.userId,
          courseId: metadata.courseId || 'WALLET_TOPUP',
          affiliateId: metadata.affiliateId || undefined,
          couponId: metadata.couponId || undefined,
          type: metadata.type || 'wallet_topup'
        }
      });

      console.log(`✅ PAIEMENT VALIDÉ : ${txnData.amount} ${txnData.currency} pour l'user ${metadata.userId}`);
      return NextResponse.json({ processed: true, status: 'success' });
    }

    // Si le statut n'est pas SUCCESS, on ne crédite pas mais on répond 200 pour dire qu'on a reçu l'info
    console.warn("⚠️ WEBHOOK: Statut non géré ou échec", body.status);
    return NextResponse.json({ received: true, status: body.status });

  } catch (error: any) {
    console.error('❌ WEBHOOK FATAL ERROR:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}