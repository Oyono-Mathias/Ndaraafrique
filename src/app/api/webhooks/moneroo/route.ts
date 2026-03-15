import { NextResponse } from 'next/server';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Adaptateur Webhook Moneroo.
 * Reçoit la notification brute et délègue au processeur central Ndara.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { status, metadata, id: transactionId, amount, currency_code } = body.data || {};

    if (status === 'successful') {
      const { userId, courseId, affiliateId, couponId, type } = metadata || {};

      if (!userId || !courseId) {
        console.error("Moneroo Webhook: Métadonnées critiques manquantes", metadata);
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // Transmission au processeur central
      await processNdaraPayment({
        transactionId,
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
    console.error('Moneroo Webhook Fatal Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
