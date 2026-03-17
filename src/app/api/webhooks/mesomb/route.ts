import { NextResponse } from 'next/server';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Webhook MeSomb (Entrée unique).
 * ✅ ENRICHI : Transmission de l'ID passerelle original.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // MeSomb envoie SUCCESS ou un statut équivalent
    const isSuccess = body.status === 'SUCCESS' || body.success === true;

    if (isSuccess) {
      const transaction = body.transaction || body;
      const metadata = transaction.metadata || transaction.extra;

      if (!metadata?.userId || !metadata?.courseId) {
        console.error("MeSomb Webhook: Métadonnées manquantes", metadata);
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // Activation centrale
      await processNdaraPayment({
        transactionId: String(transaction.pk || transaction.id),
        gatewayTransactionId: String(transaction.pk || transaction.id),
        provider: 'mesomb',
        amount: transaction.amount,
        currency: transaction.currency || 'XOF',
        metadata: {
          userId: metadata.userId,
          courseId: metadata.courseId,
          affiliateId: metadata.affiliateId || undefined,
          couponId: metadata.couponId || undefined,
          type: metadata.type || 'course_purchase'
        }
      });

      return NextResponse.json({ processed: true });
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('MeSomb Webhook Fatal Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
