import { NextResponse } from 'next/server';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Webhook Moneroo (Entrée unique).
 * Reçoit la confirmation de paiement et délègue au processeur central.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { status, metadata, id: transactionId, amount, currency_code } = body.data || {};

    // Seul le statut 'successful' déclenche l'activation
    if (status === 'successful') {
      const { userId, courseId, affiliateId, couponId, type } = metadata || {};

      if (!userId || !courseId) {
        console.error("Moneroo Webhook: Métadonnées manquantes", metadata);
        return NextResponse.json({ error: 'Incomplete metadata' }, { status: 400 });
      }

      // Appel du cerveau financier Ndara
      await processNdaraPayment({
        transactionId: String(transactionId),
        provider: 'moneroo',
        amount: amount || 0,
        currency: currency_code || 'XOF',
        metadata: {
          userId,
          courseId,
          affiliateId,
          couponId,
          type: type || 'course_purchase'
        }
      });

      return NextResponse.json({ received: true, processed: true });
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Moneroo Webhook Critical Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
