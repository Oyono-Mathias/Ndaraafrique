import { NextResponse } from 'next/server';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview MeSomb Webhook Adapter (Placeholder).
 * Will receive notifications from MeSomb and delegate to the central Ndara Payment Processor.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // MeSomb specific logic to verify signature and extract data
    // To be implemented once MeSomb keys are provided.
    
    const { transactionId, status, amount, currency, metadata } = body; 

    if (status === 'SUCCESS') {
        await processNdaraPayment({
            transactionId,
            provider: 'mesomb',
            amount,
            currency,
            metadata: {
                userId: metadata.userId,
                courseId: metadata.courseId,
                affiliateId: metadata.affiliateId,
                couponId: metadata.couponId,
                type: metadata.type || 'course_purchase'
            }
        });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('MeSomb Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
