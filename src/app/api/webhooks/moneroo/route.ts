import { NextResponse } from 'next/server';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Webhook Moneroo pour Ndara Afrique.
 * ✅ CENTRALISÉ : Délègue toute la logique au processeur financier central.
 */

export async function POST(req: Request) {
  const requestId = `WEBHOOK-MON-${Date.now()}`;
  console.log(`[${requestId}] 📨 Webhook Moneroo reçu.`);

  try {
    const body = await req.json();
    const { status, metadata, id: transactionId, amount, currency_code } = body.data || {};

    // Seul le statut 'successful' déclenche l'activation des droits
    if (status === 'successful') {
      const { userId, courseId, type } = metadata || {};

      if (!userId || !courseId) {
        console.error(`[${requestId}] ❌ Métadonnées manquantes:`, metadata);
        return NextResponse.json({ error: 'Incomplete metadata' }, { status: 400 });
      }

      // Appel du cerveau financier Ndara pour créditer ou inscrire
      await processNdaraPayment({
        transactionId: String(transactionId),
        gatewayTransactionId: String(transactionId),
        provider: 'moneroo',
        amount: Number(amount) || 0,
        currency: currency_code || 'XOF',
        metadata: {
          userId,
          courseId,
          type: type || 'course_purchase'
        }
      });

      console.log(`[${requestId}] ✅ Paiement Moneroo validé.`);
      return NextResponse.json({ received: true, processed: true });
    }

    console.log(`[${requestId}] ℹ️ Statut ignoré: ${status}`);
    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Erreur Webhook Moneroo:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
