import { NextResponse } from 'next/server';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Webhook MeSomb.
 * Reçoit les confirmations de succès et les transmet au processeur central Ndara.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // MeSomb envoie l'état de la transaction
    if (body.status === 'SUCCESS' || body.success === true) {
      
      const transaction = body.transaction || body;
      const metadata = transaction.metadata;

      if (!metadata?.userId || !metadata?.courseId) {
        console.error("MeSomb Webhook: Métadonnées incomplètes", metadata);
        return NextResponse.json({ error: 'Incomplete metadata' }, { status: 400 });
      }

      // Appel du moteur financier unique Ndara
      await processNdaraPayment({
        transactionId: transaction.pk || transaction.id,
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
