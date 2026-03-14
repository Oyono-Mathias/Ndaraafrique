import { NextResponse } from 'next/server';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Moneroo Webhook Adapter.
 * Receives the raw notification from Moneroo and delegates to the central Ndara Payment Processor.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { status, metadata, id: transactionId, amount, currency_code } = body.data || {};

    // 1. We only care about successful payments
    if (status === 'successful') {
      const { userId, courseId, affiliateId, couponId, type } = metadata || {};

      if (!userId || !courseId) {
        console.error("Moneroo Webhook: Missing critical metadata", metadata);
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // 2. Map to Ndara Transaction Format and call the central processor
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

    // Other statuses (failed, pending) are just acknowledged
    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Moneroo Webhook Fatal Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
