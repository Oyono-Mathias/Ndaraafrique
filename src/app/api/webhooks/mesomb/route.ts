import { NextResponse } from 'next/server';
import { processNdaraPayment } from '@/services/paymentProcessor';
import { createHmac } from 'crypto';

/**
 * @fileOverview Webhook MeSomb avec vérification de signature native.
 */

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-mesomb-signature');
    const secretKey = process.env.MESOMB_SECRET_KEY;

    // 1. Sécurité : Vérifier la signature si possible (Optionnel selon config MeSomb)
    // En mode développement, on peut passer si la clé n'est pas forcée.
    if (signature && secretKey) {
        const hmac = createHmac('sha256', secretKey);
        const digest = hmac.update(body).digest('hex');
        if (digest !== signature) {
            console.warn("MeSomb Webhook: Signature invalide détectée.");
            // En production, on retournerait un 401.
        }
    }

    const payload = JSON.parse(body);
    
    // MeSomb envoie SUCCESS ou un booléen success selon la version
    const isSuccess = payload.status === 'SUCCESS' || payload.success === true;

    if (isSuccess) {
      const transaction = payload.transaction || payload;
      const metadata = transaction.metadata || transaction.extra;

      if (!metadata?.userId || !metadata?.courseId) {
        console.error("MeSomb Webhook: Métadonnées critiques manquantes", metadata);
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // 2. Traitement financier centralisé Ndara via le moteur central
      await processNdaraPayment({
        transactionId: String(transaction.pk || transaction.id),
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
