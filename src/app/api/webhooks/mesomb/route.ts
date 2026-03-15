import { NextResponse } from 'next/server';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Webhook MeSomb optimisé.
 * Traite les notifications de paiement réussies en les raccordant au moteur Ndara.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // MeSomb envoie SUCCESS ou un booléen success selon la version
    const isSuccess = body.status === 'SUCCESS' || body.success === true;

    if (isSuccess) {
      const transaction = body.transaction || body;
      const metadata = transaction.metadata || transaction.extra;

      if (!metadata?.userId || !metadata?.courseId) {
        console.error("MeSomb Webhook: Métadonnées critiques manquantes", metadata);
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // 2. Traitement financier centralisé Ndara
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
